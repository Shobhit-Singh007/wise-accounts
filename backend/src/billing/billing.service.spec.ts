import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  const mockBusiness = {
    id: 'biz-1',
    name: 'My Shop',
    state: 'Maharashtra',
    gstin: '29ABCDE1234F1Z5',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Rahul Sharma',
    state: 'Maharashtra',
    gstin: '27ABCDE1234F1Z5',
    balance: 0,
    isActive: true,
  };

  const mockInvoice = {
    id: 'inv-1',
    businessId: 'biz-1',
    customerId: 'cust-1',
    invoiceNo: 'INV-1234567890-123',
    type: 'B2C',
    subtotal: 450,
    taxAmount: 22.5,
    discount: 0,
    grandTotal: 472.5,
    paidAmount: 0,
    status: 'CONFIRMED',
    createdAt: new Date('2024-06-15'),
    items: [
      {
        id: 'item-1',
        invoiceId: 'inv-1',
        productId: null,
        itemName: 'Wheat Flour',
        quantity: 10,
        unit: 'kg',
        rate: 45,
        discount: 0,
        taxableValue: 450,
        taxRate: 5,
        cgst: 11.25,
        sgst: 11.25,
        igst: 0,
        total: 472.5,
        batchNo: null,
        expiryDate: null,
      },
    ],
    customer: mockCustomer,
  };

  const createInvoiceDto = {
    type: 'B2C' as any,
    customerId: 'cust-1',
    discount: 0,
    items: [
      {
        itemName: 'Wheat Flour',
        quantity: 10,
        unit: 'kg',
        rate: 45,
        discount: 0,
        taxRate: 5,
      },
    ],
  };

  const mockPrisma = {
    business: {
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customerTransaction: {
      create: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    stockBatch: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    prisma = module.get(PrismaService);
  });

  describe('createInvoice', () => {
    it('should create a B2C invoice with CGST+SGST calculation, items, and customer balance update', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);

      const mockTx = {
        invoice: {
          create: jest.fn().mockResolvedValue(mockInvoice),
          findUnique: jest.fn().mockResolvedValue(mockInvoice),
        },
        customer: {
          findUnique: jest.fn().mockResolvedValue(mockCustomer),
          update: jest.fn().mockResolvedValue({ ...mockCustomer, balance: 472.5 }),
        },
        customerTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
        stockBatch: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      mockPrisma.$transaction.mockImplementation(
        async (cb: Function) => cb(mockTx),
      );

      const result = await service.createInvoice('biz-1', 'user-1', createInvoiceDto);

      expect(mockPrisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'biz-1' },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      expect(mockTx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'biz-1',
            customerId: 'cust-1',
            type: 'B2C',
            subtotal: 450,
            taxAmount: 22.5,
            grandTotal: 472.5,
            status: 'CONFIRMED',
            createdById: 'user-1',
          }),
        }),
      );

      expect(mockTx.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
      });
      expect(mockTx.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balance: 472.5 },
      });
      expect(mockTx.customerTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'cust-1',
            type: 'INVOICE_CREATED',
            amount: 472.5,
            balanceAfter: 472.5,
          }),
        }),
      );

      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException when business not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice('biz-unknown', 'user-1', createInvoiceDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should use $transaction for all database operations', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      mockPrisma.customer.findUnique.mockResolvedValue(mockCustomer);

      const mockTx = {
        invoice: {
          create: jest.fn().mockResolvedValue(mockInvoice),
          findUnique: jest.fn().mockResolvedValue(mockInvoice),
        },
        customer: {
          findUnique: jest.fn().mockResolvedValue(mockCustomer),
          update: jest.fn().mockResolvedValue({}),
        },
        customerTransaction: {
          create: jest.fn().mockResolvedValue({}),
        },
        stockBatch: {
          findMany: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      mockPrisma.$transaction.mockImplementation(
        async (cb: Function) => cb(mockTx),
      );

      await service.createInvoice('biz-1', 'user-1', createInvoiceDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
      expect(mockTx.invoice.create).toHaveBeenCalled();
      expect(mockTx.customer.findUnique).toHaveBeenCalled();
      expect(mockTx.customer.update).toHaveBeenCalled();
      expect(mockTx.customerTransaction.create).toHaveBeenCalled();
    });
  });

  describe('cancelInvoice', () => {
    it('should mark invoice as CANCELLED and reverse customer balance', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        items: mockInvoice.items,
        payments: [],
        createdBy: { id: 'user-1', name: 'Admin' },
      });
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
      });
      mockPrisma.customer.findUnique.mockResolvedValue({
        ...mockCustomer,
        balance: 472.5,
      });
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        balance: 0,
      });

      const result = await service.cancelInvoice('biz-1', 'inv-1');

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', businessId: 'biz-1' },
        include: {
          customer: true,
          items: true,
          payments: true,
          createdBy: { select: { id: true, name: true } },
        },
      });
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'CANCELLED' },
      });
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balance: 0 },
      });
      expect(result).toEqual({ message: 'Invoice cancelled successfully' });
    });

    it('should throw BadRequestException when invoice is already cancelled', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELLED',
        items: [],
        payments: [],
        createdBy: { id: 'user-1', name: 'Admin' },
      });

      await expect(
        service.cancelInvoice('biz-1', 'inv-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });

    it('should cancel invoice without customer update when no customerId', async () => {
      const invoiceWithoutCustomer = {
        ...mockInvoice,
        customerId: null,
        customer: null,
        items: mockInvoice.items,
        payments: [],
        createdBy: { id: 'user-1', name: 'Admin' },
      };
      mockPrisma.invoice.findFirst.mockResolvedValue(invoiceWithoutCustomer);
      mockPrisma.invoice.update.mockResolvedValue({
        ...invoiceWithoutCustomer,
        status: 'CANCELLED',
      });

      const result = await service.cancelInvoice('biz-1', 'inv-1');

      expect(result).toEqual({ message: 'Invoice cancelled successfully' });
      expect(mockPrisma.customer.update).not.toHaveBeenCalled();
    });
  });
});
