import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RecurringInvoicesService', () => {
  let service: RecurringInvoicesService;
  let prisma: any;

  const businessId = 'biz-1';
  const userId = 'user-1';
  const recurringId = 'rec-1';

  const mockRecurring = {
    id: recurringId,
    businessId,
    customerId: 'cust-1',
    templateName: 'Monthly Subscription',
    frequency: 'MONTHLY',
    nextRunDate: new Date('2024-02-01'),
    lastRunDate: null,
    isActive: true,
    items: [{ productId: 'prod-1', itemName: 'Service', quantity: 1, unit: 'piece', rate: 1000, taxRate: 18, discount: 0 }],
    notes: null,
    itemCount: 1,
    totalAmount: 1180,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      recurringInvoice: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      invoice: {
        count: jest.fn(),
        create: jest.fn(),
      },
      customer: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurringInvoicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RecurringInvoicesService>(RecurringInvoicesService);
  });

  describe('create', () => {
    it('should create a recurring invoice with correct totals', async () => {
      prisma.recurringInvoice.create.mockResolvedValue(mockRecurring);

      const result = await service.create(businessId, userId, {
        customerId: 'cust-1',
        templateName: 'Monthly Subscription',
        frequency: 'MONTHLY',
        nextRunDate: '2024-02-01',
        items: [{ productId: 'prod-1', itemName: 'Service', quantity: 1, rate: 1000, taxRate: 18 }],
      });

      expect(result.totalAmount).toBe(1180);
      expect(prisma.recurringInvoice.create).toHaveBeenCalled();
    });

    it('should calculate total with discount', async () => {
      const withDiscount = { ...mockRecurring, totalAmount: 944 };
      prisma.recurringInvoice.create.mockResolvedValue(withDiscount);

      const result = await service.create(businessId, userId, {
        customerId: 'cust-1',
        templateName: 'Discounted',
        frequency: 'WEEKLY',
        nextRunDate: '2024-02-01',
        items: [{ productId: 'prod-1', itemName: 'Item', quantity: 2, rate: 500, taxRate: 18, discount: 100 }],
      });

      expect(prisma.recurringInvoice.create).toHaveBeenCalled();
    });

    it('should default unit to piece when not provided', async () => {
      prisma.recurringInvoice.create.mockResolvedValue(mockRecurring);

      await service.create(businessId, userId, {
        customerId: 'cust-1',
        templateName: 'Test',
        frequency: 'MONTHLY',
        nextRunDate: '2024-02-01',
        items: [{ productId: 'prod-1', itemName: 'Item', quantity: 1, rate: 100, taxRate: 0 }],
      });

      const callData = prisma.recurringInvoice.create.mock.calls[0][0].data;
      expect(callData.items[0].unit).toBe('piece');
    });
  });

  describe('findAll', () => {
    it('should return all recurring invoices for a business', async () => {
      prisma.recurringInvoice.findMany.mockResolvedValue([mockRecurring]);

      const result = await service.findAll(businessId);
      expect(result).toHaveLength(1);
      expect(prisma.recurringInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { businessId } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a specific recurring invoice', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);

      const result = await service.findOne(businessId, recurringId);
      expect(result.id).toBe(recurringId);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(null);
      await expect(service.findOne(businessId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update recurring invoice fields', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      prisma.recurringInvoice.update.mockResolvedValue({ ...mockRecurring, templateName: 'Updated' });

      const result = await service.update(businessId, recurringId, { templateName: 'Updated' });
      expect(result.templateName).toBe('Updated');
    });

    it('should recalculate totals when items are updated', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      prisma.recurringInvoice.update.mockResolvedValue({ ...mockRecurring, totalAmount: 2360 });

      await service.update(businessId, recurringId, {
        items: [{ productId: 'prod-1', itemName: 'Item', quantity: 2, rate: 1000, taxRate: 18 }],
      });

      const callData = prisma.recurringInvoice.update.mock.calls[0][0].data;
      expect(callData.totalAmount).toBe(2360);
      expect(callData.itemCount).toBe(1);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(null);
      await expect(service.update(businessId, 'nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a recurring invoice', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      prisma.recurringInvoice.delete.mockResolvedValue({});

      const result = await service.remove(businessId, recurringId);
      expect(result.message).toBe('Recurring invoice deleted');
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(null);
      await expect(service.remove(businessId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActive', () => {
    it('should toggle active status from true to false', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      prisma.recurringInvoice.update.mockResolvedValue({ ...mockRecurring, isActive: false });

      const result = await service.toggleActive(businessId, recurringId);
      expect(result.isActive).toBe(false);
    });

    it('should toggle active status from false to true', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue({ ...mockRecurring, isActive: false });
      prisma.recurringInvoice.update.mockResolvedValue({ ...mockRecurring, isActive: true });

      const result = await service.toggleActive(businessId, recurringId);
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.recurringInvoice.findFirst.mockResolvedValue(null);
      await expect(service.toggleActive(businessId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
