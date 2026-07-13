import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { StaffService } from './staff.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ALL_PERMISSIONS, ROLE_PRESETS } from './permissions';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: any;

  const businessId = 'biz-1';
  const adminUserId = 'user-admin';
  const staffUserId = 'user-staff';
  const inviteId = 'inv-1';

  const mockAdminMembership = {
    userId: adminUserId,
    businessId,
    role: UserRole.BUSINESS_ADMIN,
    isDefault: true,
    permissions: ALL_PERMISSIONS,
    joinedAt: new Date(),
    user: { id: adminUserId, name: 'Admin User', phone: '1111111111', email: 'admin@test.com', avatarUrl: null },
  };

  const mockStaffMembership = {
    userId: staffUserId,
    businessId,
    role: UserRole.BUSINESS_EDITOR,
    isDefault: false,
    permissions: ['dashboard.view', 'invoices.view'],
    joinedAt: new Date(),
    user: { id: staffUserId, name: 'Staff User', phone: '9876543210', email: null, avatarUrl: null },
  };

  beforeEach(async () => {
      prisma = {
      userBusiness: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      user: { findUnique: jest.fn() },
      staffInvite: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      business: { findUnique: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StaffService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<StaffService>(StaffService);
  });

  describe('invite', () => {
    it('should create an invitation when admin invites', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.staffInvite.findFirst.mockResolvedValue(null);
      prisma.staffInvite.create.mockResolvedValue({
        id: inviteId,
        phone: '9876543210',
        email: null,
        name: 'New Staff',
        role: UserRole.BUSINESS_EDITOR,
        permissions: ['dashboard.view'],
        token: 'abc123',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.invite(businessId, adminUserId, {
        phone: '9876543210',
        name: 'New Staff',
      });

      expect(result.invite.phone).toBe('9876543210');
      expect(result.message).toContain('9876543210');
    });

    it('should throw ForbiddenException when non-admin invites', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce({ ...mockAdminMembership, role: UserRole.BUSINESS_EDITOR });

      await expect(service.invite(businessId, staffUserId, { phone: '1234567890' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when user already a member', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });
      prisma.userBusiness.findUnique.mockResolvedValueOnce({ userId: 'existing-user', businessId });

      await expect(service.invite(businessId, adminUserId, { phone: '9876543210' }))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when pending invite exists', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.staffInvite.findFirst.mockResolvedValue({ id: 'existing-invite' });

      await expect(service.invite(businessId, adminUserId, { phone: '9876543210' }))
        .rejects.toThrow(ConflictException);
    });

    it('should apply role preset permissions', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.staffInvite.findFirst.mockResolvedValue(null);
      prisma.staffInvite.create.mockResolvedValue({
        id: inviteId, phone: '9876543210', email: null, name: 'New Staff',
        role: UserRole.BUSINESS_VIEWER, permissions: ROLE_PRESETS.viewer,
        token: 'abc123', expiresAt: new Date(), createdAt: new Date(),
      });

      const result = await service.invite(businessId, adminUserId, {
        phone: '9876543210',
        role: UserRole.BUSINESS_VIEWER,
        rolePreset: 'viewer',
      });

      expect(result.invite.permissions).toEqual(ROLE_PRESETS.viewer);
    });
  });

  describe('listStaff', () => {
    it('should return list of staff members', async () => {
      prisma.userBusiness.findMany.mockResolvedValue([mockAdminMembership, mockStaffMembership]);

      const result = await service.listStaff(businessId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(adminUserId);
      expect(result[1].userId).toBe(staffUserId);
      expect(result[1].name).toBe('Staff User');
    });

    it('should return empty array when no staff', async () => {
      prisma.userBusiness.findMany.mockResolvedValue([]);

      const result = await service.listStaff(businessId);
      expect(result).toHaveLength(0);
    });
  });

  describe('updatePermissions', () => {
    it('should update permissions when admin', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockStaffMembership);
      prisma.userBusiness.update.mockResolvedValue({
        ...mockStaffMembership,
        permissions: ['dashboard.view', 'invoices.view', 'invoices.create'],
      });

      const result = await service.updatePermissions(businessId, staffUserId, {
        permissions: ['dashboard.view', 'invoices.view', 'invoices.create'],
      }, adminUserId);

      expect(result.permissions).toContain('invoices.create');
    });

    it('should throw ForbiddenException when non-admin tries to update', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce({ ...mockAdminMembership, role: UserRole.BUSINESS_EDITOR });

      await expect(service.updatePermissions(businessId, staffUserId, { permissions: [] }, staffUserId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when staff member not found', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(null);

      await expect(service.updatePermissions(businessId, 'nonexistent', { permissions: [] }, adminUserId))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when modifying business owner', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce({ ...mockStaffMembership, isDefault: true });

      await expect(service.updatePermissions(businessId, adminUserId, { permissions: [] }, adminUserId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid permissions', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockStaffMembership);

      await expect(service.updatePermissions(businessId, staffUserId, {
        permissions: ['invalid.permission'],
      }, adminUserId))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow wildcard permission', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockStaffMembership);
      prisma.userBusiness.update.mockResolvedValue({ ...mockStaffMembership, permissions: ['*'] });

      const result = await service.updatePermissions(businessId, staffUserId, {
        permissions: ['*'],
      }, adminUserId);

      expect(result.permissions).toEqual(['*']);
    });
  });

  describe('removeStaff', () => {
    it('should remove staff when admin', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce(mockStaffMembership);
      prisma.userBusiness.delete.mockResolvedValue({});

      const result = await service.removeStaff(businessId, staffUserId, adminUserId);
      expect(result.message).toContain('Staff User');
    });

    it('should throw ForbiddenException when non-admin removes', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce({ ...mockAdminMembership, role: UserRole.BUSINESS_EDITOR });

      await expect(service.removeStaff(businessId, staffUserId, staffUserId))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when removing business owner', async () => {
      prisma.userBusiness.findUnique
        .mockResolvedValueOnce(mockAdminMembership)
        .mockResolvedValueOnce({ ...mockStaffMembership, isDefault: true });

      await expect(service.removeStaff(businessId, adminUserId, adminUserId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('listPendingInvites', () => {
    it('should return pending invites', async () => {
      prisma.staffInvite.findMany.mockResolvedValue([{
        id: inviteId, phone: '9876543210', email: null, name: 'Pending',
        role: UserRole.BUSINESS_EDITOR, permissions: ['dashboard.view'],
        token: 'abc', expiresAt: new Date(), createdAt: new Date(),
        inviter: { name: 'Admin User' },
      }]);

      const result = await service.listPendingInvites(businessId);
      expect(result).toHaveLength(1);
      expect(result[0].invitedBy).toBe('Admin User');
    });
  });

  describe('cancelInvite', () => {
    it('should cancel an invite when admin', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.staffInvite.findFirst.mockResolvedValue({ id: inviteId, businessId, acceptedAt: null });
      prisma.staffInvite.delete.mockResolvedValue({});

      const result = await service.cancelInvite(businessId, inviteId, adminUserId);
      expect(result.message).toBe('Invitation cancelled');
    });

    it('should throw NotFoundException when invite not found', async () => {
      prisma.userBusiness.findUnique.mockResolvedValueOnce(mockAdminMembership);
      prisma.staffInvite.findFirst.mockResolvedValue(null);

      await expect(service.cancelInvite(businessId, 'nonexistent', adminUserId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite and create membership', async () => {
      prisma.staffInvite.findUnique.mockResolvedValue({
        id: inviteId, businessId, acceptedAt: null, expiresAt: new Date(Date.now() + 86400000),
        role: UserRole.BUSINESS_EDITOR, permissions: ['dashboard.view'],
      });
      prisma.userBusiness.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);
      prisma.business.findUnique.mockResolvedValue({ id: businessId, name: 'Test Business' });

      const result = await service.acceptInvite('token123', 'new-user');
      expect(result.message).toContain('Test Business');
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.staffInvite.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvite('bad-token', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired invite', async () => {
      prisma.staffInvite.findUnique.mockResolvedValue({
        id: inviteId, acceptedAt: null, expiresAt: new Date('2020-01-01'),
      });
      await expect(service.acceptInvite('token', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already accepted invite', async () => {
      prisma.staffInvite.findUnique.mockResolvedValue({
        id: inviteId, acceptedAt: new Date(), expiresAt: new Date(Date.now() + 86400000),
      });
      await expect(service.acceptInvite('token', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when already a member', async () => {
      prisma.staffInvite.findUnique.mockResolvedValue({
        id: inviteId, businessId, acceptedAt: null, expiresAt: new Date(Date.now() + 86400000),
      });
      prisma.userBusiness.findUnique.mockResolvedValue({ userId: 'user-1', businessId });
      await expect(service.acceptInvite('token', 'user-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('getPermissionPresets', () => {
    it('should return all role presets', async () => {
      const result = await service.getPermissionPresets();
      expect(result.length).toBeGreaterThan(0);
      expect(result.find((p) => p.key === 'viewer')).toBeDefined();
      expect(result.find((p) => p.key === 'manager')).toBeDefined();
    });
  });
});
