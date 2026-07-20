import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    payment: {
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
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
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

  describe('getLedger', () => {
    const mockInvoice = {
      id: 'inv-1',
      invoiceNo: 'INV-001',
      invoiceDate: new Date('2024-01-15'),
      createdAt: new Date('2024-01-10'),
      grandTotal: 5000,
      paidAmount: 0,
      status: 'CONFIRMED',
      type: 'B2C',
      subtotal: 5000,
      taxAmount: 0,
    };

    const mockPayment = {
      id: 'pay-1',
      amount: 2000,
      method: 'CASH',
      status: 'COMPLETED',
      reference: null,
      notes: null,
      paidAt: new Date('2024-01-20'),
    };

    const mockTransaction = {
      id: 'tx-1',
      type: 'LEDGER_GAVE',
      amount: 1000,
      description: 'Advance payment',
      transactionDate: new Date('2024-01-25'),
      createdAt: new Date('2024-01-25'),
      imageUrl: null,
    };

    beforeEach(() => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.customerTransaction.findMany.mockResolvedValue([]);
    });

    it('should return ledger with opening balance', async () => {
      const customerWithBalance = {
        ...mockCustomer,
        openingBalance: 10000,
        balance: 15000,
        createdAt: new Date('2024-01-01'),
      };
      mockPrisma.customer.findFirst.mockResolvedValue(customerWithBalance);

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.customer).toBeDefined();
      expect(result.summary.openingBalance).toBe(10000);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe('OPENING_BALANCE');
      expect(result.entries[0].balanceAfter).toBe(10000);
    });

    it('should combine invoices, payments, and manual entries', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        openingBalance: 5000,
        createdAt: new Date('2024-01-01'),
      });
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.customerTransaction.findMany.mockResolvedValue([mockTransaction]);

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.entries.length).toBeGreaterThanOrEqual(3);
      const invoiceEntry = result.entries.find((e: any) => e.type === 'SALE_INVOICE');
      const paymentEntry = result.entries.find((e: any) => e.type === 'PAYMENT_RECEIVED');
      const gaveEntry = result.entries.find((e: any) => e.type === 'LEDGER_GAVE');

      expect(invoiceEntry).toBeDefined();
      expect(invoiceEntry!.debit).toBe(5000);
      expect(paymentEntry).toBeDefined();
      expect(paymentEntry!.credit).toBe(2000);
      expect(gaveEntry).toBeDefined();
      expect(gaveEntry!.debit).toBe(1000);
    });

    it('should calculate correct running balance', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        openingBalance: 0,
        createdAt: new Date('2024-01-01'),
      });
      mockPrisma.invoice.findMany.mockResolvedValue([
        { ...mockInvoice, grandTotal: 3000 },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        { ...mockPayment, amount: 2000 },
      ]);

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.summary.totalDebit).toBe(3000);
      expect(result.summary.totalCredit).toBe(2000);
      expect(result.summary.closingBalance).toBe(3000 - 2000);
    });

    it('should skip cancelled invoices', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        openingBalance: 0,
        createdAt: new Date('2024-01-01'),
      });
      mockPrisma.invoice.findMany.mockResolvedValue([
        { ...mockInvoice, status: 'CANCELLED' },
        { ...mockInvoice, id: 'inv-2', grandTotal: 4000, status: 'CONFIRMED' },
      ]);

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.entries.filter((e: any) => e.type === 'SALE_INVOICE')).toHaveLength(1);
      expect(result.summary.totalDebit).toBe(4000);
    });

    it('should handle empty ledger with no entries', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        openingBalance: 0,
        createdAt: new Date('2024-01-01'),
      });

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.entries).toHaveLength(0);
      expect(result.summary.totalDebit).toBe(0);
      expect(result.summary.totalCredit).toBe(0);
      expect(result.summary.closingBalance).toBe(0);
    });

    it('should sort entries by date', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        openingBalance: 0,
        createdAt: new Date('2024-01-01'),
      });
      mockPrisma.invoice.findMany.mockResolvedValue([
        { ...mockInvoice, id: 'inv-1', grandTotal: 1000, invoiceDate: new Date('2024-01-15') },
      ]);
      mockPrisma.customerTransaction.findMany.mockResolvedValue([
        { ...mockTransaction, id: 'tx-1', type: 'LEDGER_GAVE', amount: 2000, transactionDate: new Date('2024-01-10') },
      ]);

      const result = await service.getLedger('biz-1', 'cust-1');

      expect(result.entries[0].id).toBe('tx_tx-1');
      expect(result.entries[1].id).toBe('inv_inv-1');
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
