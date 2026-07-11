import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  const mockInvoice = {
    id: 'inv-1',
    businessId: 'biz-1',
    customerId: 'cust-1',
    invoiceNo: 'INV-001',
    type: 'B2C',
    subtotal: 450,
    taxAmount: 22.5,
    discount: 0,
    grandTotal: 472.5,
    paidAmount: 200,
    status: 'CONFIRMED',
    invoiceDate: new Date('2024-06-15'),
    createdAt: new Date('2024-06-15'),
    customer: {
      id: 'cust-1',
      name: 'Rahul Sharma',
      gstin: '27ABCDE1234F1Z5',
    },
    items: [
      {
        id: 'item-1',
        itemName: 'Wheat Flour',
        quantity: 10,
        rate: 45,
        taxableValue: 450,
        taxRate: 5,
        cgst: 11.25,
        sgst: 11.25,
        igst: 0,
        total: 472.5,
      },
    ],
  };

  const mockB2BInvoice = {
    ...mockInvoice,
    id: 'inv-2',
    invoiceNo: 'INV-B2B-001',
    type: 'B2B',
    subtotal: 10000,
    taxAmount: 1800,
    grandTotal: 11800,
    paidAmount: 11800,
    customer: {
      id: 'cust-2',
      name: 'ABC Corp',
      gstin: '29ABCDE1234F1Z5',
    },
    items: [
      {
        id: 'item-2',
        itemName: 'Machinery Part',
        quantity: 1,
        rate: 10000,
        taxableValue: 10000,
        taxRate: 18,
        cgst: 900,
        sgst: 900,
        igst: 0,
        total: 11800,
      },
    ],
  };

  const mockPrisma = {
    invoice: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get(PrismaService);
  });

  describe('getSalesReport', () => {
    it('should return aggregated sales data with category breakdown', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        mockInvoice,
        mockB2BInvoice,
      ]);

      const result = await service.getSalesReport('biz-1');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', status: 'CONFIRMED' },
          include: { items: true, customer: true },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.summary.totalSales).toBe(472.5 + 11800);
      expect(result.summary.totalTax).toBe(22.5 + 1800);
      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.averageInvoice).toBe((472.5 + 11800) / 2);
      expect(result.categorySales).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Wheat Flour', count: 10 }),
          expect.objectContaining({ name: 'Machinery Part', count: 1 }),
        ]),
      );
      expect(result.invoices).toHaveLength(2);
    });

    it('should apply date filters when provided', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);

      const result = await service.getSalesReport(
        'biz-1',
        '2024-01-01',
        '2024-12-31',
      );

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: 'biz-1',
            status: 'CONFIRMED',
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
      expect(result.period).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });

    it('should return zero totals when no invoices exist', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.getSalesReport('biz-1');

      expect(result.summary.totalSales).toBe(0);
      expect(result.summary.totalTax).toBe(0);
      expect(result.summary.totalInvoices).toBe(0);
      expect(result.summary.averageInvoice).toBe(0);
      expect(result.categorySales).toEqual([]);
    });
  });

  describe('getGstr1', () => {
    it('should separate B2B and B2C invoices correctly', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        mockInvoice,
        mockB2BInvoice,
      ]);

      const result = await service.getGstr1(
        'biz-1',
        '2024-01-01',
        '2024-12-31',
      );

      expect(result.b2b).toHaveLength(1);
      expect(result.b2b[0].invoiceNo).toBe('INV-B2B-001');
      expect(result.b2b[0].customerName).toBe('ABC Corp');
      expect(result.b2b[0].customerGstin).toBe('29ABCDE1234F1Z5');
      expect(result.b2b[0].taxableValue).toBe(10000);
      expect(result.b2b[0].taxAmount).toBe(1800);
      expect(result.b2b[0].grandTotal).toBe(11800);

      expect(result.b2c.count).toBe(1);
      expect(result.b2c.totalTaxableValue).toBe(450);
      expect(result.b2c.totalTax).toBe(22.5);

      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.totalTaxableValue).toBe(10450);
      expect(result.summary.totalTax).toBe(1822.5);
    });
  });

  describe('getGstr3b', () => {
    it('should return monthly summary for given month and year', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        mockInvoice,
        mockB2BInvoice,
      ]);

      const result = await service.getGstr3b('biz-1', 6, 2024);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: 'biz-1',
            status: 'CONFIRMED',
            createdAt: {
              gte: new Date(2024, 5, 1),
              lte: new Date(2024, 6, 0),
            },
          },
        }),
      );

      expect(result.month).toBe(6);
      expect(result.year).toBe(2024);
      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.totalTaxableValue).toBe(10450);
      expect(result.summary.totalTax).toBe(1822.5);
      expect(result.summary.totalPaid).toBe(200 + 11800);
      expect(result.summary.outstanding).toBe(
        (472.5 - 200) + (11800 - 11800),
      );
    });
  });

  describe('getProfitLoss', () => {
    it('should calculate revenue correctly from confirmed invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([
        mockInvoice,
        { ...mockB2BInvoice, grandTotal: 11800, subtotal: 10000, taxAmount: 1800, discount: 0 },
      ]);

      const result = await service.getProfitLoss('biz-1');

      expect(result.revenue).toBe(472.5 + 11800);
      expect(result.totalSales).toBe(450 + 10000);
      expect(result.totalTax).toBe(22.5 + 1800);
      expect(result.totalDiscount).toBe(0);
      expect(result.netProfit).toBe(472.5 + 11800);
      expect(result.invoiceCount).toBe(2);
    });

    it('should filter by date range when provided', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoice]);

      const result = await service.getProfitLoss(
        'biz-1',
        '2024-01-01',
        '2024-06-30',
      );

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: 'biz-1',
            status: 'CONFIRMED',
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-06-30'),
            },
          },
          include: { items: true },
        }),
      );
      expect(result.invoiceCount).toBe(1);
    });
  });
});
