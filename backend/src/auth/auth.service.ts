import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { DynamoDBService } from '../aws/dynamo-db.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpStore = new Map<string, { otp: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dynamoDB: DynamoDBService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone number is required');
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existingPhone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone || `email_${uuidv4().split('-')[0]}`,
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    let user = null;
    if (dto.email) {
      user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    }
    if (!user && dto.phone) {
      user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    }
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);

    // Cache active session in DynamoDB for fast lookups
    await this.dynamoDB.setSession(user.id, {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      loginAt: new Date().toISOString(),
    }, 7 * 24 * 3600); // 7 days

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.generateTokens(user.id, user.phone, user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revoked: false },
      data: { revoked: true },
    });

    // Clear DynamoDB session cache
    const stored = await this.prisma.refreshToken.findFirst({ where: { token: refreshToken } });
    if (stored) {
      await this.dynamoDB.deleteSession(stored.userId);
    }
  }

  async getMe(userId: string) {
    // Try DynamoDB cache first for faster response
    const cached = await this.dynamoDB.getSession(userId);
    if (cached) {
      return { id: cached.userId, phone: cached.phone, role: cached.role, name: cached.name };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Cache for next time
    await this.dynamoDB.setSession(userId, {
      userId: user.id,
      phone: user.phone,
      role: user.role,
      name: user.name,
    }, 7 * 24 * 3600);

    return this.sanitizeUser(user);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(phone?: string, email?: string) {
    if (!phone && !email) {
      throw new BadRequestException('Phone or email is required');
    }

    const identifier = phone || email!;
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    this.otpStore.set(`reset_${identifier}`, { otp, expiresAt });

    const isDev = this.configService.get('NODE_ENV') !== 'production';
    if (isDev) {
      this.logger.log(`Reset OTP for ${identifier}: ${otp}`);
    }

    if (phone) {
      try {
        await this.notificationsService.sendOtpSms(phone, otp);
      } catch (err) {
        this.logger.error(`SMS failed for ${phone}: ${(err as Error).message}`);
      }
    }
    if (email) {
      try {
        await this.notificationsService.sendOtpEmail(email, otp);
      } catch (err) {
        this.logger.error(`Email failed for ${email}: ${(err as Error).message}`);
      }
    }

    if (isDev) {
      return { message: 'OTP sent', otp };
    }
    return { message: 'OTP sent to your registered contact' };
  }

  async resetPassword(identifier: string, otp: string, newPassword: string) {
    const cached = this.otpStore.get(`reset_${identifier}`);
    if (!cached) {
      throw new BadRequestException('OTP not found. Please request a new one.');
    }
    if (cached.expiresAt < new Date()) {
      this.otpStore.delete(`reset_${identifier}`);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }
    if (cached.otp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    this.otpStore.delete(`reset_${identifier}`);

    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await this.prisma.user.findUnique({ where: { email: identifier } })
      : await this.prisma.user.findUnique({ where: { phone: identifier } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { message: 'Password reset successfully' };
  }

  async sendOtp(phone: string, email?: string) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpStore.set(phone, { otp, expiresAt });

    const isDev = this.configService.get('NODE_ENV') !== 'production';

    if (isDev) {
      this.logger.log(`OTP for ${phone}: ${otp}`);
    }

    let smsSent = false;
    let emailSent = false;

    // Try SMS
    try {
      await this.notificationsService.sendOtpSms(phone, otp);
      smsSent = true;
    } catch (err) {
      this.logger.error(`SMS OTP failed for ${phone}: ${(err as Error).message}`);
    }

    // Try email if provided
    if (email) {
      try {
        await this.notificationsService.sendOtpEmail(email, otp);
        emailSent = true;
      } catch (err) {
        this.logger.error(`Email OTP failed for ${email}: ${(err as Error).message}`);
      }
    }

    const delivered = smsSent || emailSent;

    if (isDev) {
      return { success: true, message: 'OTP sent', expiresIn: 600, otp };
    }

    return {
      success: true,
      message: delivered
        ? `OTP sent via ${smsSent && emailSent ? 'SMS and email' : smsSent ? 'SMS' : 'email'}`
        : 'OTP generated but delivery failed. Check server logs.',
      expiresIn: 600,
    };
  }

  async verifyOtp(phone: string, otp: string) {
    const cached = this.otpStore.get(phone);

    if (!cached) {
      throw new BadRequestException('OTP expired or not found. Please request a new OTP.');
    }

    if (cached.expiresAt < new Date()) {
      this.otpStore.delete(phone);
      throw new BadRequestException('OTP expired. Please request a new OTP.');
    }

    if (cached.otp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    this.otpStore.delete(phone);

    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone,
          name: `User ${phone.slice(-4)}`,
          passwordHash: await bcrypt.hash(Math.random().toString(36).slice(-12), 10),
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.phone, user.role);
    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const payload = { sub: userId, phone, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRY', '15m') as any,
    });

    const refreshTokenValue = uuidv4();
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
