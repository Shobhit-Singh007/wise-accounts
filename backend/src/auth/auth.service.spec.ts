import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { DynamoDBService } from '../aws/dynamo-db.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-refresh-token-uuid'),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-1',
    phone: '+919876543210',
    email: 'user@example.com',
    name: 'John Doe',
    role: 'BUSINESS_ADMIN',
    isActive: true,
    passwordHash: 'hashed-password',
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRefreshToken = {
    id: 'rt-1',
    token: 'valid-refresh-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    createdAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'JWT_EXPIRY') return '15m';
      return defaultValue;
    }),
  };

  const mockDynamoDB = {
    isAvailable: true,
    setSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue(null),
    deleteSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
        providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DynamoDBService, useValue: mockDynamoDB },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    const registerDto = {
      phone: '+919876543210',
      email: 'user@example.com',
      name: 'John Doe',
      password: 'Password@123',
    };

    it('should register a new user and return user with tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.register(registerDto);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: registerDto.phone },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          phone: registerDto.phone,
          email: registerDto.email,
          name: registerDto.name,
          passwordHash: 'hashed-password',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
      expect(result.user).toBeDefined();
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-uuid');
    });

    it('should throw ConflictException when phone already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      phone: '+919876543210',
      password: 'Password@123',
    };

    it('should login successfully with valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login(loginDto);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: loginDto.phone },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-uuid');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValueOnce(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenValue = 'valid-refresh-token';

    it('should generate new tokens for valid refresh token', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const storedToken = { ...mockRefreshToken, expiresAt: futureDate };
      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrisma.refreshToken.update.mockResolvedValue({
        ...storedToken,
        revoked: true,
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.refreshToken(refreshTokenValue);

      expect(mockPrisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: refreshTokenValue },
      });
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token-uuid');
    });

    it('should throw UnauthorizedException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 86400000),
      });

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is deactivated', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: futureDate,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.refreshToken(refreshTokenValue)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('valid-refresh-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'valid-refresh-token', revoked: false },
        data: { revoked: true },
      });
    });
  });
});
