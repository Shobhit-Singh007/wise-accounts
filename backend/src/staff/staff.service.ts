import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { ROLE_PRESETS, ALL_PERMISSIONS } from './permissions';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  async invite(businessId: string, inviterId: string, dto: InviteStaffDto) {
    const membership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: inviterId, businessId } },
    });

    if (!membership || membership.role !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenException('Only business admins can invite staff');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existingUser) {
      const existingMembership = await this.prisma.userBusiness.findUnique({
        where: { userId_businessId: { userId: existingUser.id, businessId } },
      });
      if (existingMembership) {
        throw new ConflictException('This user is already a member of this business');
      }
    }

    const existingInvite = await this.prisma.staffInvite.findFirst({
      where: {
        businessId,
        phone: dto.phone,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException('An invitation has already been sent to this phone number');
    }

    const permissions = dto.rolePreset
      ? ROLE_PRESETS[dto.rolePreset] || dto.permissions || []
      : dto.permissions || [];

    const role = dto.role || UserRole.BUSINESS_EDITOR;

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
    const businessName = business?.name || 'the business';

    const invite = await this.prisma.staffInvite.create({
      data: {
        businessId,
        phone: dto.phone,
        email: dto.email,
        name: dto.name,
        permissions,
        role,
        token,
        invitedById: inviterId,
        expiresAt,
      },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://wiseaccs.com');
    const inviteLink = `${frontendUrl}/staff/accept-invite/${token}`;

    const inviter = dto.email ? await this.prisma.user.findUnique({ where: { id: inviterId }, select: { name: true } }) : null;

    try {
      await this.notifications.sendStaffInviteSms(dto.phone, businessName, inviteLink);
      this.logger.log(`Staff invite SMS sent to ${dto.phone}: ${inviteLink}`);
    } catch (err) {
      this.logger.error(`Failed to send staff invite SMS: ${(err as Error).message}`);
      this.logger.log(`STAFF INVITE LINK (SMS fallback): ${inviteLink}`);
    }

    if (dto.email) {
      try {
        await this.notifications.sendStaffInviteEmail(dto.email, businessName, inviter?.name || 'Admin', inviteLink);
        this.logger.log(`Staff invite email sent to ${dto.email}: ${inviteLink}`);
      } catch (err) {
        this.logger.error(`Failed to send staff invite email: ${(err as Error).message}`);
        this.logger.log(`STAFF INVITE LINK (Email fallback): ${inviteLink}`);
      }
    }

    this.logger.log(`Staff invite created - Phone: ${dto.phone}, Link: ${inviteLink}`);

    return {
      invite: {
        id: invite.id,
        phone: invite.phone,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        permissions: invite.permissions,
        token: invite.token,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
      message: `Invitation sent to ${dto.phone}. Invite link: ${inviteLink}`,
    };
  }

  async listStaff(businessId: string) {
    const members = await this.prisma.userBusiness.findMany({
      where: { businessId },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      phone: m.user.phone,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      permissions: m.permissions,
      isDefault: m.isDefault,
      joinedAt: m.joinedAt,
    }));
  }

  async updatePermissions(businessId: string, userId: string, dto: UpdatePermissionsDto, adminId: string) {
    const adminMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: adminId, businessId } },
    });

    if (!adminMembership || adminMembership.role !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenException('Only business admins can update permissions');
    }

    const targetMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: { user: { select: { name: true } } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Staff member not found in this business');
    }

    if (targetMembership.isDefault) {
      throw new ForbiddenException('Cannot modify permissions of the business owner');
    }

    const invalidPerms = dto.permissions.filter((p) => !ALL_PERMISSIONS.includes(p) && p !== '*');
    if (invalidPerms.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalidPerms.join(', ')}`);
    }

    const updated = await this.prisma.userBusiness.update({
      where: { userId_businessId: { userId, businessId } },
      data: {
        permissions: dto.permissions,
        ...(dto.role ? { role: dto.role } : {}),
      },
    });

    return {
      userId,
      name: targetMembership.user.name,
      role: updated.role,
      permissions: updated.permissions,
    };
  }

  async removeStaff(businessId: string, userId: string, adminId: string) {
    const adminMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: adminId, businessId } },
    });

    if (!adminMembership || adminMembership.role !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenException('Only business admins can remove staff');
    }

    const targetMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: { user: { select: { name: true } } },
    });

    if (!targetMembership) {
      throw new NotFoundException('Staff member not found in this business');
    }

    if (targetMembership.isDefault) {
      throw new ForbiddenException('Cannot remove the business owner');
    }

    await this.prisma.userBusiness.delete({
      where: { userId_businessId: { userId, businessId } },
    });

    return { message: `${targetMembership.user.name} has been removed from this business` };
  }

  async listPendingInvites(businessId: string) {
    const invites = await this.prisma.staffInvite.findMany({
      where: {
        businessId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((inv) => ({
      id: inv.id,
      phone: inv.phone,
      email: inv.email,
      name: inv.name,
      role: inv.role,
      permissions: inv.permissions,
      token: inv.token,
      invitedBy: inv.inviter.name,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }

  async cancelInvite(businessId: string, inviteId: string, adminId: string) {
    const adminMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId: adminId, businessId } },
    });

    if (!adminMembership || adminMembership.role !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenException('Only business admins can cancel invitations');
    }

    const invite = await this.prisma.staffInvite.findFirst({
      where: { id: inviteId, businessId, acceptedAt: null },
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    await this.prisma.staffInvite.delete({ where: { id: inviteId } });

    return { message: 'Invitation cancelled' };
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.staffInvite.findUnique({ where: { token } });

    if (!invite) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invite.acceptedAt) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (new Date() > invite.expiresAt) {
      throw new BadRequestException('This invitation has expired');
    }

    const existingMembership = await this.prisma.userBusiness.findUnique({
      where: { userId_businessId: { userId, businessId: invite.businessId } },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this business');
    }

    await this.prisma.$transaction([
      this.prisma.userBusiness.create({
        data: {
          userId,
          businessId: invite.businessId,
          role: invite.role,
          permissions: invite.permissions as any,
          isDefault: false,
        },
      }),
      this.prisma.staffInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), inviteeId: userId },
      }),
    ]);

    const business = await this.prisma.business.findUnique({
      where: { id: invite.businessId },
      select: { id: true, name: true },
    });

    return {
      message: `You have joined ${business?.name || 'the business'}`,
      business,
    };
  }

  async getPermissionPresets() {
    return Object.entries(ROLE_PRESETS).map(([key, perms]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      permissions: perms,
    }));
  }
}
