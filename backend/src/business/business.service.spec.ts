import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BusinessService } from './business.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BusinessService', () => {
  let service: BusinessService;
  let prisma: any;

  const mockBusiness = {
    id: 'biz-1',
    name: 'My Shop',
    gstin: '29ABCDE1234F1Z5',
    phone: '+919876543210',
    email: 'shop@example.com',
    address: '123, Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    logoUrl: null,
    settings: {},
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const createBusinessDto = {
    name: 'My Shop',
    gstin: '29ABCDE1234F1Z5',
    phone: '+919876543210',
    email: 'shop@example.com',
    address: '123, Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
  };

  const mockPrisma = {
    business: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userBusiness: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    warehouse: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    customer: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BusinessService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BusinessService>(BusinessService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a business with UserBusiness and default warehouse', async () => {
      mockPrisma.business.create.mockResolvedValue(mockBusiness);
      mockPrisma.userBusiness.create.mockResolvedValue({});
      mockPrisma.warehouse.create.mockResolvedValue({});

      const result = await service.create('user-1', createBusinessDto);

      expect(mockPrisma.business.create).toHaveBeenCalledWith({
        data: createBusinessDto,
      });
      expect(mockPrisma.userBusiness.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', businessId: mockBusiness.id, isDefault: true },
      });
      expect(mockPrisma.warehouse.create).toHaveBeenCalledWith({
        data: { businessId: mockBusiness.id, name: 'Main Warehouse' },
      });
      expect(result).toEqual(mockBusiness);
    });
  });

  describe('findAll', () => {
    it('should return all businesses for a user', async () => {
      const memberships = [
        { business: mockBusiness },
        { business: { ...mockBusiness, id: 'biz-2', name: 'Shop 2' } },
      ];
      mockPrisma.userBusiness.findMany.mockResolvedValue(memberships);

      const result = await service.findAll('user-1');

      expect(mockPrisma.userBusiness.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { business: true },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockBusiness);
    });
  });

  describe('findOne', () => {
    it('should return a business by id', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);

      const result = await service.findOne('biz-1');

      expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'biz-1' },
      });
      expect(result).toEqual(mockBusiness);
    });

    it('should throw NotFoundException when business not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(service.findOne('biz-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDashboard', () => {
    it('should return correct dashboard counts and sums', async () => {
      mockPrisma.customer.count.mockResolvedValue(50);
      mockPrisma.product.count.mockResolvedValue(100);
      mockPrisma.invoice.count.mockResolvedValue(200);
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { grandTotal: 500000, paidAmount: 300000 },
      });

      const result = await service.getDashboard('biz-1');

      expect(mockPrisma.customer.count).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
      });
      expect(mockPrisma.product.count).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
      });
      expect(mockPrisma.invoice.count).toHaveBeenCalledWith({
        where: { businessId: 'biz-1' },
      });
      expect(mockPrisma.invoice.aggregate).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', status: 'CONFIRMED' },
        _sum: { grandTotal: true, paidAmount: true },
      });
      expect(result).toEqual({
        totalCustomers: 50,
        totalProducts: 100,
        totalInvoices: 200,
        totalBilled: 500000,
        totalPaid: 300000,
        outstanding: 200000,
      });
    });

    it('should handle zero values gracefully', async () => {
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.product.count.mockResolvedValue(0);
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { grandTotal: null, paidAmount: null },
      });

      const result = await service.getDashboard('biz-1');

      expect(result).toEqual({
        totalCustomers: 0,
        totalProducts: 0,
        totalInvoices: 0,
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
      });
    });
  });
});
