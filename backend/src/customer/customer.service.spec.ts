import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: any;
  let paymentsService: any;

  const mockCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    groupId: null,
    name: 'Rahul Sharma',
    phone: '+919876543210',
    email: 'rahul@example.com',
    gstin: '07ABCDE1234F1Z5',
    address: '456, Park Street',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    creditLimit: 50000,
    balance: 0,
    openingBalance: 0,
    notes: null,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    customerTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
  };

  const mockPaymentsService = {
    recordPayment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    prisma = module.get(PrismaService);
    paymentsService = module.get(PaymentsService);
  });

  describe('create', () => {
    const createDto = {
      name: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul@example.com',
    };

    it('should create a customer without opening balance transaction', async () => {
      mockPrisma.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create('biz-1', createDto);

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: { businessId: 'biz-1', ...createDto, balance: 0 },
      });
      expect(mockPrisma.customerTransaction.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockCustomer);
    });

    it('should create a customer with opening balance and transaction', async () => {
      const dtoWithBalance = { ...createDto, openingBalance: 5000 };
      const customerWithBalance = { ...mockCustomer, balance: 5000, openingBalance: 5000 };
      mockPrisma.customer.create.mockResolvedValue(customerWithBalance);
      mockPrisma.customerTransaction.create.mockResolvedValue({});

      const result = await service.create('biz-1', dtoWithBalance);

      expect(mockPrisma.customer.create).toHaveBeenCalledWith({
        data: { businessId: 'biz-1', ...createDto, balance: 5000 },
      });
      expect(mockPrisma.customerTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          type: 'OPENING_BALANCE',
          amount: 5000,
          balanceAfter: 5000,
          description: 'Opening balance',
        },
      });
      expect(result).toEqual(customerWithBalance);
    });
  });

  describe('findAll', () => {
    const mockCustomers = [
      { ...mockCustomer, group: null },
      { ...mockCustomer, id: 'cust-2', name: 'Priya Patel', group: null },
    ];

    it('should return paginated customers without search', async () => {
      mockPrisma.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrisma.customer.count.mockResolvedValue(2);

      const result = await service.findAll('biz-1');

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
        orderBy: { createdAt: 'desc' },
        include: { group: true },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply search filter on name and phone', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomers[0]]);
      mockPrisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll('biz-1', 'Rahul');

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          businessId: 'biz-1',
          isActive: true,
          OR: [
            { name: { contains: 'Rahul', mode: 'insensitive' } },
            { phone: { contains: 'Rahul' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: { group: true },
        skip: 0,
        take: 20,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a customer when found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        group: null,
      });

      const result = await service.findOne('biz-1', 'cust-1');

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', businessId: 'biz-1' },
        include: { group: true },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('biz-1', 'cust-unknown'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    const paymentDto = {
      amount: 1000,
      method: 'CASH' as any,
      notes: 'Test payment',
    };

    it('should delegate to paymentsService.recordPayment after verifying customer', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        group: null,
      });
      mockPaymentsService.recordPayment.mockResolvedValue({
        id: 'pay-1',
        amount: 1000,
      });

      const result = await service.recordPayment('biz-1', 'cust-1', paymentDto);

      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', businessId: 'biz-1' },
        include: { group: true },
      });
      expect(mockPaymentsService.recordPayment).toHaveBeenCalledWith('biz-1', {
        customerId: 'cust-1',
        amount: 1000,
        method: 'CASH',
        notes: 'Test payment',
      });
      expect(result).toEqual({ id: 'pay-1', amount: 1000 });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment('biz-1', 'cust-unknown', paymentDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockPaymentsService.recordPayment).not.toHaveBeenCalled();
    });
  });
});
