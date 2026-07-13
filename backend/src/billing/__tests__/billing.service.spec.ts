import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from '../billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EwayBillApiService } from '../services/ewaybill-api.service';
import { EinvoiceApiService } from '../services/einvoice-api.service';
import { InvoiceTemplatesService } from '../services/invoice-templates.service';
import { NotFoundException } from '@nestjs/common';

describe('BillingService', () => {
  let service: BillingService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      business: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'biz1',
          name: 'Test Business',
          state: 'Maharashtra',
          gstin: '27ABCDE1234F1Z5',
          isActive: true,
        }),
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: '1', invoiceNo: 'INV-001', grandTotal: 1000 }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      invoiceItem: {
        createMany: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1', name: 'Test Customer', phone: '9999999999' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', name: 'Test Customer', state: 'Maharashtra' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: EwayBillApiService, useValue: { generateEwayBill: jest.fn() } },
        { provide: EinvoiceApiService, useValue: { generateEinvoice: jest.fn() } },
        { provide: InvoiceTemplatesService, useValue: { generateInvoiceHtml: jest.fn() } },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllInvoices', () => {
    it('should return paginated invoices list', async () => {
      prismaMock.invoice.findMany.mockResolvedValue([
        { id: '1', invoiceNo: 'INV-001', grandTotal: 1000, customer: {}, items: [], payments: [] },
      ]);
      prismaMock.invoice.count.mockResolvedValue(1);

      const result = await service.findAllInvoices('biz1', {});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should apply status filter', async () => {
      await service.findAllInvoices('biz1', { status: 'CONFIRMED' });

      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'CONFIRMED' }),
        }),
      );
    });

    it('should apply direction filter', async () => {
      await service.findAllInvoices('biz1', { direction: 'SALE' });

      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ direction: 'SALE' }),
        }),
      );
    });

    it('should apply pagination', async () => {
      await service.findAllInvoices('biz1', { page: 2, limit: 10 });

      expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findOneInvoice', () => {
    it('should return invoice when found', async () => {
      const mockInvoice = {
        id: 'inv1',
        businessId: 'biz1',
        customer: {},
        items: [],
        payments: [],
        createdBy: { id: 'u1', name: 'Admin' },
      };
      prismaMock.invoice.findFirst.mockResolvedValue(mockInvoice);

      const result = await service.findOneInvoice('biz1', 'inv1');
      expect(result.id).toBe('inv1');
    });

    it('should throw NotFoundException when invoice not found', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(null);
      await expect(service.findOneInvoice('biz1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
