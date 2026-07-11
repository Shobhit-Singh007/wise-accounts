import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SyncService', () => {
  let service: SyncService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-1',
    businessId: 'biz-1',
    name: 'Organic Wheat Flour',
    sku: 'WF-001',
    sellingPrice: 45,
    isActive: true,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-15'),
  };

  const mockCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Rahul Sharma',
    phone: '+919876543210',
    isActive: true,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-15'),
  };

  const mockInvoice = {
    id: 'inv-1',
    businessId: 'biz-1',
    invoiceNo: 'INV-001',
    grandTotal: 472.5,
    status: 'CONFIRMED',
    createdAt: new Date('2024-06-15'),
    items: [],
  };

  const mockPayment = {
    id: 'pay-1',
    businessId: 'biz-1',
    amount: 500,
    method: 'CASH',
    createdAt: new Date('2024-06-16'),
  };

  const mockStockBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    quantity: 100,
    updatedAt: new Date('2024-06-15'),
    product: mockProduct,
  };

  const mockPrisma = {
    customer: {
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    product: {
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
    stockBatch: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    prisma = module.get(PrismaService);
  });

  describe('pushChanges', () => {
    it('should process all changes and return sync results', async () => {
      mockPrisma.customer.upsert.mockResolvedValue(mockCustomer);
      mockPrisma.product.upsert.mockResolvedValue(mockProduct);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const changes = [
        {
          table: 'customers',
          action: 'create',
          data: { id: 'cust-1', name: 'Rahul Sharma', phone: '+919876543210' },
        },
        {
          table: 'products',
          action: 'update',
          data: { id: 'prod-1', name: 'Organic Wheat Flour', sellingPrice: 50 },
        },
        {
          table: 'payments',
          action: 'create',
          data: { amount: 500, method: 'CASH' },
        },
      ];

      const result = await service.pushChanges('biz-1', 'device-1', changes);

      expect(mockPrisma.customer.upsert).toHaveBeenCalled();
      expect(mockPrisma.product.upsert).toHaveBeenCalled();
      expect(mockPrisma.payment.create).toHaveBeenCalled();

      expect(result.synced).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({
        table: 'customers',
        action: 'create',
        success: true,
      });
    });

    it('should handle errors gracefully and continue processing', async () => {
      mockPrisma.customer.upsert.mockRejectedValue(
        new Error('Database error'),
      );
      mockPrisma.product.upsert.mockResolvedValue(mockProduct);

      const changes = [
        {
          table: 'customers',
          action: 'create',
          data: { name: 'Rahul' },
        },
        {
          table: 'products',
          action: 'create',
          data: { name: 'Rice' },
        },
      ];

      const result = await service.pushChanges('biz-1', 'device-1', changes);

      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Database error');
      expect(result.results[1].success).toBe(true);
    });

    it('should handle delete action for customers', async () => {
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        isActive: false,
      });

      const changes = [
        {
          table: 'customers',
          action: 'delete',
          data: { id: 'cust-1' },
        },
      ];

      await service.pushChanges('biz-1', 'device-1', changes);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { isActive: false },
      });
    });

    it('should handle unknown table with error', async () => {
      const changes = [
        {
          table: 'unknown_table',
          action: 'create',
          data: { id: '1' },
        },
      ];

      const result = await service.pushChanges('biz-1', 'device-1', changes);

      expect(result.synced).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain('Unknown table');
    });
  });

  describe('pullChanges', () => {
    it('should return data since timestamp with counts', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomer]);
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.stockBatch.findMany.mockResolvedValue([mockStockBatch]);

      const result = await service.pullChanges(
        'biz-1',
        'device-1',
        '2024-06-01T00:00:00Z',
      );

      expect(result.data.products).toHaveLength(1);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.invoices).toHaveLength(1);
      expect(result.data.payments).toHaveLength(1);
      expect(result.data.stockBatches).toHaveLength(1);

      expect(result.counts).toEqual({
        products: 1,
        customers: 1,
        invoices: 1,
        payments: 1,
        stockBatches: 1,
      });

      expect(typeof result.timestamp).toBe('string');
    });

    it('should use epoch start when no lastSyncAt is provided', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      await service.pullChanges('biz-1', 'device-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: 'biz-1',
            updatedAt: { gte: new Date(0) },
          },
        }),
      );
    });
  });
});
