import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BusinessSettingsController } from './business-settings.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('BusinessSettingsController', () => {
  let controller: BusinessSettingsController;

  const mockBusiness = {
    id: 'biz1',
    settings: {
      tax: { defaultTaxRate: 12, taxDisplayMode: 'exclusive' },
      notifications: { emailNotifications: false, smsNotifications: true },
      apiCredentials: { razorpayKeyId: 'key_123' },
    },
  };

  const mockPrisma = {
    business: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessSettingsController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<BusinessSettingsController>(BusinessSettingsController);
    jest.clearAllMocks();
  });

  describe('getTaxSettings', () => {
    it('returns defaults when no settings', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue({
        id: 'biz1', settings: {},
      });

      const result = await controller.getTaxSettings('biz1');
      expect(result).toEqual({ defaultTaxRate: 18, taxDisplayMode: 'inclusive' });
    });

    it('returns saved settings', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue(mockBusiness);

      const result = await controller.getTaxSettings('biz1');
      expect(result).toEqual({ defaultTaxRate: 12, taxDisplayMode: 'exclusive' });
    });
  });

  describe('updateTaxSettings', () => {
    it('merges with existing settings', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue({});

      const result = await controller.updateTaxSettings('biz1', {
        defaultTaxRate: 5,
      });

      expect(result).toEqual({ defaultTaxRate: 5, taxDisplayMode: 'exclusive' });
      expect(mockPrisma.business.update).toHaveBeenCalledWith({
        where: { id: 'biz1' },
        data: {
          settings: {
            tax: { defaultTaxRate: 5, taxDisplayMode: 'exclusive' },
            notifications: { emailNotifications: false, smsNotifications: true },
            apiCredentials: { razorpayKeyId: 'key_123' },
          },
        },
      });
    });
  });

  describe('getNotificationSettings', () => {
    it('returns defaults', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue({
        id: 'biz1', settings: {},
      });

      const result = await controller.getNotificationSettings('biz1');
      expect(result).toEqual({ emailNotifications: true, smsNotifications: false });
    });
  });

  describe('updateNotificationSettings', () => {
    it('merges correctly', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue({});

      const result = await controller.updateNotificationSettings('biz1', {
        emailNotifications: true,
      });

      expect(result).toEqual({ emailNotifications: true, smsNotifications: true });
    });
  });

  describe('getApiCredentials', () => {
    it('returns empty when none set', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue({
        id: 'biz1', settings: {},
      });

      const result = await controller.getApiCredentials('biz1');
      expect(result).toEqual({});
    });

    it('returns saved credentials', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue(mockBusiness);

      const result = await controller.getApiCredentials('biz1');
      expect(result).toEqual({ razorpayKeyId: 'key_123' });
    });
  });

  describe('updateApiCredentials', () => {
    it('merges correctly', async () => {
      mockPrisma.business.findUniqueOrThrow.mockResolvedValue(mockBusiness);
      mockPrisma.business.update.mockResolvedValue({});

      const result = await controller.updateApiCredentials('biz1', {
        razorpayKeySecret: 'secret_456',
      });

      expect(result).toEqual({
        razorpayKeyId: 'key_123',
        razorpayKeySecret: 'secret_456',
      });
    });
  });

  describe('throws when business not found', () => {
    it('getTaxSettings throws NotFoundException', async () => {
      mockPrisma.business.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found'),
      );

      await expect(controller.getTaxSettings('nonexistent')).rejects.toThrow();
    });
  });
});
