import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let configService: any;

  const mockInvoice = {
    id: 'inv-1',
    businessId: 'biz-1',
    customerId: 'cust-1',
    invoiceNo: 'INV-001',
    amount: 472.5,
    paidAmount: 0,
    grandTotal: 472.5,
    status: 'CONFIRMED',
  };

  const mockCustomer = {
    id: 'cust-1',
    businessId: 'biz-1',
    name: 'Rahul Sharma',
    balance: 472.5,
    isActive: true,
  };

  const mockPayment = {
    id: 'pay-1',
    businessId: 'biz-1',
    invoiceId: 'inv-1',
    customerId: 'cust-1',
    amount: 500,
    method: 'CASH',
    reference: null,
    notes: 'Test payment',
    status: 'COMPLETED',
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRazorpayOrder = {
    id: 'rzo-1',
    businessId: 'biz-1',
    invoiceId: 'inv-1',
    razorpayOrderId: 'order_Mock123',
    amount: 47250,
    status: 'CREATED',
  };

  const mockPrisma = {
    invoice: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    customerTransaction: {
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    razorpayOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'UPI_ID') return 'payment@upi';
      if (key === 'RAZORPAY_KEY_SECRET') return 'rzp_secret';
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_key';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  describe('recordPayment', () => {
    const paymentDto = {
      invoiceId: 'inv-1',
      customerId: 'cust-1',
      amount: 500,
      method: 'CASH' as any,
      notes: 'Test payment',
    };

    it('should update invoice paidAmount and customer balance, then create payment', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        paidAmount: 500,
      });
      mockPrisma.customer.findFirst.mockResolvedValue({
        ...mockCustomer,
        balance: 472.5,
      });
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        balance: -27.5,
      });
      mockPrisma.customerTransaction.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.recordPayment('biz-1', paymentDto);

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', businessId: 'biz-1' },
      });
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paidAmount: 500 },
      });
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'cust-1', businessId: 'biz-1' },
      });
      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { balance: -27.5 },
      });
      expect(mockPrisma.customerTransaction.create).toHaveBeenCalledWith({
        data: {
          customerId: 'cust-1',
          type: 'PAYMENT_RECEIVED',
          amount: 500,
          balanceAfter: -27.5,
          description: 'Test payment',
        },
      });
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          businessId: 'biz-1',
          invoiceId: 'inv-1',
          customerId: 'cust-1',
          amount: 500,
          method: 'CASH',
          reference: undefined,
          notes: 'Test payment',
        },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment('biz-1', paymentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle payment without invoiceId', async () => {
      const dtoNoInvoice = {
        customerId: 'cust-1',
        amount: 500,
        method: 'CASH' as any,
      };
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        balance: -27.5,
      });
      mockPrisma.customerTransaction.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.recordPayment('biz-1', dtoNoInvoice);

      expect(mockPrisma.invoice.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockPayment);
    });
  });

  describe('verifyRazorpayWebhook', () => {
    const webhookBody = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_Mock123',
            order_id: 'order_Mock123',
            amount: 47250,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    it('should process payment.captured event successfully', async () => {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', 'rzp_secret')
        .update(JSON.stringify(webhookBody))
        .digest('hex');

      mockPrisma.razorpayOrder.findUnique.mockResolvedValue(mockRazorpayOrder);
      mockPrisma.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrisma.invoice.update.mockResolvedValue({
        ...mockInvoice,
        paidAmount: 472.5,
      });
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.customer.update.mockResolvedValue({
        ...mockCustomer,
        balance: 0,
      });
      mockPrisma.customerTransaction.create.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.razorpayOrder.update.mockResolvedValue({
        ...mockRazorpayOrder,
        status: 'CAPTURED',
      });

      const result = await service.verifyRazorpayWebhook(
        webhookBody,
        expectedSignature,
      );

      expect(mockPrisma.razorpayOrder.findUnique).toHaveBeenCalledWith({
        where: { razorpayOrderId: 'order_Mock123' },
      });
      expect(mockPrisma.razorpayOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockRazorpayOrder.id },
          data: { status: 'CAPTURED' },
        }),
      );
      expect(result).toEqual({ received: true });
    });

    it('should throw BadRequestException on invalid signature', async () => {
      await expect(
        service.verifyRazorpayWebhook(webhookBody, 'invalid-signature'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateUpiLink', () => {
    it('should return a valid UPI link', async () => {
      const result = await service.generateUpiLink('biz-1', 500, 'Payment for invoice');

      expect(result).toEqual({
        upiLink: 'upi://pay?pa=payment@upi&am=500&tn=Payment%20for%20invoice&cu=INR',
        upiId: 'payment@upi',
        amount: 500,
      });
    });

    it('should use default description when not provided', async () => {
      const result = await service.generateUpiLink('biz-1', 100);

      expect(result.upiLink).toContain('tn=Payment');
      expect(result.upiLink).toContain('pa=payment@upi');
      expect(result.upiLink).toContain('am=100');
    });
  });
});
