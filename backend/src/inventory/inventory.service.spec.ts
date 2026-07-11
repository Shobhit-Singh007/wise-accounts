import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  const mockProduct = {
    id: 'prod-1',
    businessId: 'biz-1',
    categoryId: null,
    name: 'Organic Wheat Flour',
    sku: 'WF-001',
    hsnCode: '1105',
    unit: 'kg',
    sellingPrice: 45,
    purchasePrice: 35,
    mrp: 50,
    taxRate: 5,
    taxType: 'inclusive',
    trackBatch: false,
    trackExpiry: false,
    lowStockThreshold: 10,
    imageUrl: null,
    barcode: null,
    isService: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockWarehouse = {
    id: 'wh-1',
    businessId: 'biz-1',
    name: 'Main Warehouse',
    isActive: true,
  };

  const mockStockBatch = {
    id: 'batch-1',
    productId: 'prod-1',
    warehouseId: 'wh-1',
    batchNo: 'BATCH-001',
    quantity: 100,
    expiryDate: new Date('2025-12-31'),
    purchasePrice: 35,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    stockBatch: {
      groupBy: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    warehouse: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    supplier: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    purchaseOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get(PrismaService);
  });

  describe('createProduct', () => {
    const createProductDto = {
      name: 'Organic Wheat Flour',
      sku: 'WF-001',
      sellingPrice: 45,
      purchasePrice: 35,
      unit: 'kg',
      taxRate: 5,
    };

    it('should create a product and return it with zero stock', async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.createProduct('biz-1', createProductDto as any);

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: { ...createProductDto, businessId: 'biz-1' },
      });
      expect(result).toEqual({ ...mockProduct, stock: 0 });
    });
  });

  describe('adjustStock', () => {
    const stockAdjustDto = {
      type: 'PURCHASE' as any,
      quantity: 50,
      warehouseId: 'wh-1',
    };

    beforeEach(() => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        category: null,
        stockBatches: [{ ...mockStockBatch }],
      });
      mockPrisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
    });

    it('should add stock on PURCHASE type', async () => {
      mockPrisma.stockBatch.findFirst.mockResolvedValue(mockStockBatch);
      mockPrisma.stockBatch.update.mockResolvedValue({
        ...mockStockBatch,
        quantity: 150,
      });
      mockPrisma.stockMovement.create.mockResolvedValue({});

      const result = await service.adjustStock('biz-1', 'prod-1', stockAdjustDto);

      expect(mockPrisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: mockStockBatch.id },
        data: { quantity: 150 },
      });
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          warehouseId: 'wh-1',
          batchNo: undefined,
          type: 'PURCHASE',
          quantity: 50,
          notes: undefined,
        },
      });
      expect(result.quantity).toBe(100);
    });

    it('should deduct stock on SALE type', async () => {
      mockPrisma.stockBatch.findFirst.mockResolvedValue(mockStockBatch);
      mockPrisma.stockBatch.update.mockResolvedValue({
        ...mockStockBatch,
        quantity: 50,
      });
      mockPrisma.stockMovement.create.mockResolvedValue({});

      const result = await service.adjustStock('biz-1', 'prod-1', {
        type: 'SALE',
        quantity: 50,
        warehouseId: 'wh-1',
      } as any);

      expect(mockPrisma.stockBatch.update).toHaveBeenCalledWith({
        where: { id: mockStockBatch.id },
        data: { quantity: 50 },
      });
      expect(result.quantity).toBe(100);
    });

    it('should throw BadRequestException when insufficient stock for SALE', async () => {
      mockPrisma.stockBatch.findFirst.mockResolvedValue(mockStockBatch);

      await expect(
        service.adjustStock('biz-1', 'prod-1', {
          type: 'SALE',
          quantity: 200,
          warehouseId: 'wh-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new batch when no existing batch found for PURCHASE', async () => {
      mockPrisma.stockBatch.findFirst.mockResolvedValue(null);
      mockPrisma.stockBatch.create.mockResolvedValue(mockStockBatch);
      mockPrisma.stockMovement.create.mockResolvedValue({});

      const result = await service.adjustStock('biz-1', 'prod-1', stockAdjustDto);

      expect(mockPrisma.stockBatch.create).toHaveBeenCalled();
      expect(result).toEqual(mockStockBatch);
    });

    it('should throw BadRequestException when trying to deduct from non-existent batch', async () => {
      mockPrisma.stockBatch.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustStock('biz-1', 'prod-1', {
          type: 'SALE',
          quantity: 10,
          warehouseId: 'wh-1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferStock', () => {
    const transferDto = {
      productId: 'prod-1',
      fromWarehouseId: 'wh-1',
      toWarehouseId: 'wh-2',
      quantity: 30,
      notes: 'Stock transfer',
    };

    beforeEach(() => {
      mockPrisma.product.findFirst.mockResolvedValue({
        ...mockProduct,
        category: null,
        stockBatches: [{ ...mockStockBatch }],
      });
      mockPrisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
    });

    it('should deduct from source and add to destination warehouse', async () => {
      const sourceBatch = { ...mockStockBatch, warehouseId: 'wh-1' };
      const destBatch = {
        ...mockStockBatch,
        id: 'batch-2',
        warehouseId: 'wh-2',
      };

      mockPrisma.stockBatch.findFirst
        .mockResolvedValueOnce(sourceBatch)
        .mockResolvedValueOnce(null);
      mockPrisma.stockBatch.update.mockResolvedValue({
        ...sourceBatch,
        quantity: 70,
      });
      mockPrisma.stockBatch.create.mockResolvedValue({
        ...destBatch,
        quantity: 30,
      });
      mockPrisma.stockMovement.create.mockResolvedValue({});

      await service.transferStock('biz-1', transferDto);

      expect(mockPrisma.stockBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sourceBatch.id },
          data: { quantity: 70 },
        }),
      );
      expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('getLowStockAlerts', () => {
    it('should return products with stock at or below threshold', async () => {
      const products = [
        { ...mockProduct, lowStockThreshold: 10 },
        { ...mockProduct, id: 'prod-2', name: 'Rice', lowStockThreshold: 20 },
      ];
      mockPrisma.product.findMany.mockResolvedValue(products);
      mockPrisma.stockBatch.groupBy.mockResolvedValue([
        { productId: 'prod-1', _sum: { quantity: 5 } },
        { productId: 'prod-2', _sum: { quantity: 25 } },
      ]);

      const result = await service.getLowStockAlerts('biz-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: 'prod-1',
        productName: 'Organic Wheat Flour',
        sku: 'WF-001',
        currentStock: 5,
        threshold: 10,
      });
    });

    it('should return empty array when no products with threshold are found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.getLowStockAlerts('biz-1');

      expect(result).toEqual([]);
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches expiring within the given days', async () => {
      const expiringBatches = [
        {
          ...mockStockBatch,
          product: mockProduct,
          warehouse: mockWarehouse,
        },
      ];
      mockPrisma.stockBatch.findMany.mockResolvedValue(expiringBatches);

      const result = await service.getExpiringBatches('biz-1', 30);

      expect(mockPrisma.stockBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiryDate: expect.objectContaining({
              lte: expect.any(Date),
              gte: expect.any(Date),
            }),
            quantity: { gt: 0 },
            product: { businessId: 'biz-1', isActive: true },
          }),
          include: { product: true, warehouse: true },
          orderBy: { expiryDate: 'asc' },
        }),
      );
      expect(result).toEqual(expiringBatches);
    });
  });
});
