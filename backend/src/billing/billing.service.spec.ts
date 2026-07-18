import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { EwayBillApiService } from './services/ewaybill-api.service';
import { EinvoiceApiService } from './services/einvoice-api.service';
import { InvoiceTemplatesService } from './services/invoice-templates.service';

const mockPrisma = {
  business: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findFirst: jest.fn().mockResolvedValue({ id: 'p1' }),
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
  },
  invoice: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  invoiceItem: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  customerTransaction: {
    create: jest.fn(),
  },
  supplier: {
    findUnique: jest.fn(),
  },
  stockBatch: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  auditLog: {
    create: jest.fn(),
  },
};

const mockEwayBillApi = { generateEwayBill: jest.fn() };
const mockEinvoiceApi = { generateEinvoice: jest.fn() };
const mockTemplatesService = {
  getTemplates: jest.fn(),
  getTemplate: jest.fn(),
  getActiveTemplate: jest.fn(),
};

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EwayBillApiService, useValue: mockEwayBillApi },
        { provide: EinvoiceApiService, useValue: mockEinvoiceApi },
        { provide: InvoiceTemplatesService, useValue: mockTemplatesService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    jest.clearAllMocks();
  });

  describe('generateInvoiceNumber', () => {
    it('uses correct prefix for INVOICE documentType', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({
        state: 'Maharashtra',
      });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'INV-B2B-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2B',
        direction: 'SALE',
        documentType: 'INVOICE',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^INV/);
    });

    it('uses correct prefix for QUOTATION', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'QUO-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'QUOTATION',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^QUO/);
    });

    it('uses correct prefix for PROFORMA', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'PRO-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'PROFORMA',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^PRO/);
    });

    it('uses correct prefix for DELIVERY_CHALLAN', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'DC-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'DELIVERY_CHALLAN',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^DC/);
    });

    it('uses correct prefix for JOBWORK', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'JW-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'JOBWORK',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^JW/);
    });

    it('uses correct prefix for CREDIT_NOTE', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'CN-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'CREDIT_NOTE',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^CN/);
    });

    it('uses correct prefix for LETTERHEAD', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'LTR-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'LETTERHEAD',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.invoiceNo).toMatch(/^LTR/);
    });
  });

  describe('getDocumentTypeLabel', () => {
    it('returns correct labels', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'INV-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const docTypes = [
        { type: 'INVOICE', expected: 'Tax Invoice' },
        { type: 'QUOTATION', expected: 'Quotation' },
        { type: 'PROFORMA', expected: 'Proforma Invoice' },
        { type: 'DELIVERY_CHALLAN', expected: 'Delivery Challan' },
        { type: 'JOBWORK', expected: 'Job Work' },
        { type: 'CREDIT_NOTE', expected: 'Credit Note' },
        { type: 'LETTERHEAD', expected: 'Letterhead' },
      ];

      for (const { type, expected } of docTypes) {
        mockPrisma.invoice.create.mockResolvedValue({
          id: 'inv1', invoiceNo: 'test', documentType: type, items: [],
        });

        mockTemplatesService.getActiveTemplate.mockReturnValue({
          accentColor: '#000',
          headerStyle: 'minimal',
          tableStyle: 'default',
        });

        const result = await service.createInvoice('biz1', 'user1', {
          customerId: 'c1',
          type: 'B2C',
          direction: 'SALE',
          documentType: type,
          items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
        });

        expect(result.documentType).toBe(type);
      }
    });
  });

  describe('createInvoice', () => {
    it('stores documentType', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'INV-test', documentType: 'QUOTATION', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      const result = await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        documentType: 'QUOTATION',
        items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
      });

      expect(result.documentType).toBe('QUOTATION');
    });

    it('auto-creates product when productId missing but itemName present', async () => {
      mockPrisma.business.findUnique.mockResolvedValue({
        id: 'biz1', state: 'Maharashtra', settings: {},
      });
      mockPrisma.customer.findUnique.mockResolvedValue({ state: 'Maharashtra' });
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1', balance: 0 });
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ id: 'new-prod' });
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv1', invoiceNo: 'INV-test', items: [],
      });
      mockPrisma.stockBatch.findMany.mockResolvedValue([]);

      await service.createInvoice('biz1', 'user1', {
        customerId: 'c1',
        type: 'B2C',
        direction: 'SALE',
        items: [{ itemName: 'Custom Product', quantity: 2, rate: 250, taxRate: 18 }],
      });

      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId: 'biz1',
          name: 'Custom Product',
          sellingPrice: 250,
          taxRate: 18,
        }),
      });
    });

    it('throws NotFoundException when business not found', async () => {
      mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice('nonexistent', 'user1', {
          type: 'B2C',
          direction: 'SALE',
          items: [{ itemName: 'Item', quantity: 1, rate: 100 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
