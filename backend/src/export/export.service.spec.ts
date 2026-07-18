import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: any;

  const mockCustomers = [
    {
      id: 'cust-1',
      businessId: 'biz-1',
      name: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul@example.com',
      gstin: '07ABCDE1234F1Z5',
      address: '456, Park Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      creditLimit: 50000,
      balance: 1500,
      openingBalance: 5000,
      isActive: true,
    },
    {
      id: 'cust-2',
      businessId: 'biz-1',
      name: 'Priya Patel',
      phone: null,
      email: null,
      gstin: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      creditLimit: null,
      balance: 0,
      openingBalance: null,
      isActive: true,
    },
    {
      id: 'cust-3',
      businessId: 'biz-1',
      name: 'Inactive Customer',
      phone: '+911234567890',
      email: 'inactive@test.com',
      gstin: null,
      address: '789, Main Rd',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      creditLimit: 0,
      balance: -500,
      openingBalance: 0,
      isActive: false,
    },
  ];

  const mockProducts = [
    {
      id: 'prod-1',
      businessId: 'biz-1',
      name: 'GST Billing Software',
      sku: 'SW-001',
      hsnCode: '998314',
      unit: 'NOS',
      sellingPrice: 999,
      purchasePrice: 0,
      taxRate: 18,
      lowStockThreshold: 10,
      isActive: true,
    },
    {
      id: 'prod-2',
      businessId: 'biz-1',
      name: 'USB Cable',
      sku: null,
      hsnCode: '854442',
      unit: 'PCS',
      sellingPrice: 199,
      purchasePrice: 100,
      taxRate: 12,
      lowStockThreshold: null,
      isActive: true,
    },
    {
      id: 'prod-3',
      businessId: 'biz-1',
      name: 'Old Product',
      sku: 'OLD-001',
      hsnCode: null,
      unit: 'KG',
      sellingPrice: 50,
      purchasePrice: 30,
      taxRate: 5,
      lowStockThreshold: 20,
      isActive: false,
    },
  ];

  const mockInvoices = [
    {
      id: 'inv-1',
      businessId: 'biz-1',
      invoiceNo: 'INV-001',
      invoiceDate: new Date('2024-03-15'),
      type: 'TAX_INVOICE',
      direction: 'SALE',
      subtotal: 1000,
      taxAmount: 180,
      discount: 50,
      grandTotal: 1130,
      paidAmount: 1000,
      status: 'PARTIAL',
      customer: { name: 'Rahul Sharma' },
      supplier: null,
    },
    {
      id: 'inv-2',
      businessId: 'biz-1',
      invoiceNo: 'PUR-001',
      invoiceDate: new Date('2024-03-16'),
      type: 'BILL',
      direction: 'PURCHASE',
      subtotal: 5000,
      taxAmount: 900,
      discount: 0,
      grandTotal: 5900,
      paidAmount: 5900,
      status: 'PAID',
      customer: null,
      supplier: { name: 'Supplier Corp' },
    },
  ];

  const mockPrisma = {
    customer: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get(PrismaService);
  });

  describe('exportCustomers', () => {
    it('should export only active customers', async () => {
      const activeOnly = mockCustomers.filter((c) => c.isActive);
      mockPrisma.customer.findMany.mockResolvedValue(activeOnly);

      const result = await service.exportCustomers('biz-1');

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result.rows).toHaveLength(2);
      expect(result.headers).toHaveLength(12);
    });

    it('should handle customers with null optional fields', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomers[1]]);

      const result = await service.exportCustomers('biz-1');

      const row = result.rows[0];
      expect(row[1]).toBe(''); // phone
      expect(row[2]).toBe(''); // email
      expect(row[3]).toBe(''); // gstin
      expect(row[4]).toBe(''); // address
      expect(row[5]).toBe(''); // city
      expect(row[6]).toBe(''); // state
      expect(row[7]).toBe(''); // pincode
      expect(row[8]).toBe('0'); // openingBalance defaults to 0
      expect(row[9]).toBe('0'); // creditLimit defaults to 0
    });

    it('should format numeric fields correctly', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomers[0]]);

      const result = await service.exportCustomers('biz-1');

      const row = result.rows[0];
      expect(row[8]).toBe('5000'); // openingBalance
      expect(row[9]).toBe('50000'); // creditLimit
      expect(row[10]).toBe('1500'); // balance
    });

    it('should show "Active"/"Inactive" status', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([mockCustomers[0]]);

      const result = await service.exportCustomers('biz-1');
      expect(result.rows[0][11]).toBe('Active');

      mockPrisma.customer.findMany.mockResolvedValue([mockCustomers[2]]);
      const result2 = await service.exportCustomers('biz-1');
      expect(result2.rows[0][11]).toBe('Inactive');
    });

    it('should return empty rows when no customers', async () => {
      mockPrisma.customer.findMany.mockResolvedValue([]);

      const result = await service.exportCustomers('biz-1');

      expect(result.rows).toHaveLength(0);
      expect(result.headers).toHaveLength(12);
    });
  });

  describe('exportProducts', () => {
    it('should export only active products', async () => {
      const activeOnly = mockProducts.filter((p) => p.isActive);
      mockPrisma.product.findMany.mockResolvedValue(activeOnly);

      const result = await service.exportProducts('biz-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result.rows).toHaveLength(2);
      expect(result.headers).toHaveLength(9);
    });

    it('should format tax rate with % suffix', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]);

      const result = await service.exportProducts('biz-1');
      expect(result.rows[0][6]).toBe('18%');
    });

    it('should handle null optional fields', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[1]]);

      const result = await service.exportProducts('biz-1');

      const row = result.rows[0];
      expect(row[1]).toBe(''); // sku
      expect(row[7]).toBe('10'); // lowStockThreshold defaults to 10
    });

    it('should format numeric fields correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]);

      const result = await service.exportProducts('biz-1');

      const row = result.rows[0];
      expect(row[4]).toBe('999'); // sellingPrice
      expect(row[5]).toBe('0'); // purchasePrice
    });

    it('should return empty rows when no products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);

      const result = await service.exportProducts('biz-1');
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('exportInvoices', () => {
    it('should export all invoices when no direction filter', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.exportInvoices('biz-1');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1' },
        include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: { invoiceDate: 'desc' },
      });
      expect(result.rows).toHaveLength(2);
      expect(result.headers).toHaveLength(12);
    });

    it('should filter by SALE direction', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

      const result = await service.exportInvoices('biz-1', 'SALE');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', direction: 'SALE' },
        include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: { invoiceDate: 'desc' },
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][3]).toBe('SALE');
    });

    it('should filter by PURCHASE direction', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[1]]);

      const result = await service.exportInvoices('biz-1', 'PURCHASE');

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1', direction: 'PURCHASE' },
        include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: { invoiceDate: 'desc' },
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][3]).toBe('PURCHASE');
    });

    it('should show customer name for SALE invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows[0][4]).toBe('Rahul Sharma');
    });

    it('should show supplier name for PURCHASE invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[1]]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows[0][4]).toBe('Supplier Corp');
    });

    it('should calculate balance as grandTotal minus paidAmount', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

      const result = await service.exportInvoices('biz-1');
      const balance = 1130 - 1000; // grandTotal - paidAmount
      expect(result.rows[0][10]).toBe(String(balance));
    });

    it('should format invoice date as YYYY-MM-DD', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows[0][1]).toBe('2024-03-15');
    });

    it('should handle null customer/supplier gracefully', async () => {
      const invoiceWithNulls = {
        ...mockInvoices[0],
        customer: null,
        supplier: null,
      };
      mockPrisma.invoice.findMany.mockResolvedValue([invoiceWithNulls]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows[0][4]).toBe('');
    });

    it('should handle null grandTotal/paidAmount', async () => {
      const invoiceWithNulls = {
        ...mockInvoices[0],
        grandTotal: null,
        paidAmount: null,
      };
      mockPrisma.invoice.findMany.mockResolvedValue([invoiceWithNulls]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows[0][8]).toBe('0'); // grandTotal defaults to 0
      expect(result.rows[0][9]).toBe('0'); // paidAmount defaults to 0
      expect(result.rows[0][10]).toBe('0'); // balance = 0 - 0
    });

    it('should return empty rows when no invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.exportInvoices('biz-1');
      expect(result.rows).toHaveLength(0);
    });

    it('should not add direction to where when direction is undefined', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      await service.exportInvoices('biz-1', undefined);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz-1' },
        include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: { invoiceDate: 'desc' },
      });
    });
  });

  describe('toCsv', () => {
    it('should produce CSV with BOM', () => {
      const data = { headers: ['A', 'B'], rows: [['1', '2']] };
      const csv = service.toCsv(data);
      expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM
    });

    it('should produce correct CSV structure', () => {
      const data = { headers: ['Name', 'Value'], rows: [['foo', 'bar'], ['baz', 'qux']] };
      const csv = service.toCsv(data);
      const lines = csv.replace(/^\uFEFF/, '').split('\n');
      expect(lines).toEqual(['Name,Value', 'foo,bar', 'baz,qux']);
    });

    it('should handle empty data', () => {
      const data = { headers: ['A'], rows: [] };
      const csv = service.toCsv(data);
      const lines = csv.replace(/^\uFEFF/, '').split('\n');
      expect(lines).toEqual(['A']);
    });

    it('should escape commas in cells', () => {
      const data = { headers: ['Name'], rows: [['New York, NY']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"New York, NY"');
    });

    it('should escape double quotes by doubling them', () => {
      const data = { headers: ['Name'], rows: [['Say "Hello"']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"Say ""Hello"""');
    });

    it('should escape cells starting with = (formula injection prevention)', () => {
      const data = { headers: ['Name'], rows: [['=SUM(A1:A10)']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"=SUM(A1:A10)"');
    });

    it('should escape cells starting with + (formula injection prevention)', () => {
      const data = { headers: ['Name'], rows: [['+100']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"+100"');
    });

    it('should escape cells starting with - (formula injection prevention)', () => {
      const data = { headers: ['Name'], rows: [['-50']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"-50"');
    });

    it('should escape cells starting with @ (formula injection prevention)', () => {
      const data = { headers: ['Name'], rows: [['@SUM(1)']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"@SUM(1)"');
    });

    it('should escape cells containing newlines', () => {
      const data = { headers: ['Name'], rows: [['Line1\nLine2']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"Line1\nLine2"');
    });

    it('should escape cells containing carriage returns', () => {
      const data = { headers: ['Name'], rows: [['Line1\rLine2']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"Line1\rLine2"');
    });

    it('should escape cells starting with tab character', () => {
      const data = { headers: ['Name'], rows: [['\tcol1']] };
      const csv = service.toCsv(data);
      expect(csv).toContain('"\tcol1"');
    });

    it('should not escape simple values', () => {
      const data = { headers: ['Name'], rows: [['hello']] };
      const csv = service.toCsv(data);
      expect(csv).toBe('\uFEFFName\nhello');
    });
  });

  describe('toJson', () => {
    it('should produce valid JSON array', () => {
      const data = { headers: ['Name', 'Value'], rows: [['foo', 'bar']] };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toEqual([{ Name: 'foo', Value: 'bar' }]);
    });

    it('should handle multiple rows', () => {
      const data = {
        headers: ['A', 'B'],
        rows: [['1', '2'], ['3', '4']],
      };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ A: '1', B: '2' });
      expect(parsed[1]).toEqual({ A: '3', B: '4' });
    });

    it('should handle empty rows', () => {
      const data = { headers: ['A', 'B'], rows: [] };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual([]);
    });

    it('should handle missing row values gracefully', () => {
      const data = { headers: ['A', 'B', 'C'], rows: [['1']] };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(parsed[0]).toEqual({ A: '1', B: '', C: '' });
    });

    it('should produce pretty-printed JSON (2 spaces)', () => {
      const data = { headers: ['A'], rows: [['1']] };
      const json = service.toJson(data);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should handle special characters in values', () => {
      const data = { headers: ['Name'], rows: [['<script>alert("xss")</script>']] };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(parsed[0].Name).toBe('<script>alert("xss")</script>');
    });

    it('should handle unicode characters', () => {
      const data = { headers: ['Name', 'Value'], rows: [['राहुल शर्मा', '₹1000']] };
      const json = service.toJson(data);
      const parsed = JSON.parse(json);
      expect(parsed[0].Name).toBe('राहुल शर्मा');
      expect(parsed[0].Value).toBe('₹1000');
    });
  });
});
