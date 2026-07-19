import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ImportService } from './import.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('csv-parse/sync', () => ({
  parse: jest.fn(),
}));

jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: { sheet_to_json: jest.fn() },
}));

import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

const mockPrisma = {
  customer: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  invoice: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    jest.clearAllMocks();
  });

  describe('normalizeCustomerRecord', () => {
    it('normalizes lowercase field names', () => {
      const result = service.normalizeCustomerRecord({
        name: 'Test Customer',
        phone: '9876543210',
        email: 'test@test.com',
        gstin: '27AABCU9603R1ZM',
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        openingBalance: '5000',
      });

      expect(result.name).toBe('Test Customer');
      expect(result.phone).toBe('9876543210');
      expect(result.email).toBe('test@test.com');
      expect(result.gstin).toBe('27AABCU9603R1ZM');
      expect(result.address).toBe('123 Main St');
      expect(result.city).toBe('Mumbai');
      expect(result.state).toBe('Maharashtra');
      expect(result.pincode).toBe('400001');
      expect(result.openingBalance).toBe(5000);
    });

    it('handles capitalized field names', () => {
      const result = service.normalizeCustomerRecord({
        Name: 'Capitalized',
        Phone: '1234567890',
        Email: 'cap@test.com',
        GSTIN: '27AABCU9603R1ZM',
        Address: '456 Oak Ave',
        City: 'Delhi',
        State: 'Delhi',
        Pincode: '110001',
        OpeningBalance: '2500',
      });

      expect(result.name).toBe('Capitalized');
      expect(result.phone).toBe('1234567890');
      expect(result.email).toBe('cap@test.com');
      expect(result.gstin).toBe('27AABCU9603R1ZM');
      expect(result.openingBalance).toBe(2500);
    });

    it('strips non-numeric chars from phone', () => {
      const result = service.normalizeCustomerRecord({
        name: 'Test',
        phone: '+91-98765-43210',
      });
      expect(result.phone).toBe('+919876543210');
    });

    it('returns 0 for null/empty openingBalance', () => {
      expect(service.normalizeCustomerRecord({ name: 'A', openingBalance: null }).openingBalance).toBe(0);
      expect(service.normalizeCustomerRecord({ name: 'A', openingBalance: '' }).openingBalance).toBe(0);
      expect(service.normalizeCustomerRecord({ name: 'A' }).openingBalance).toBe(0);
    });

    it('handles missing fields gracefully', () => {
      const result = service.normalizeCustomerRecord({ name: 'Only Name' });
      expect(result.name).toBe('Only Name');
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
      expect(result.gstin).toBeNull();
      expect(result.address).toBeNull();
      expect(result.city).toBeNull();
      expect(result.state).toBeNull();
      expect(result.pincode).toBeNull();
      expect(result.openingBalance).toBe(0);
    });
  });

  describe('normalizeProductRecord', () => {
    it('normalizes field names', () => {
      const result = service.normalizeProductRecord({
        name: 'Widget',
        sku: 'W001',
        hsnCode: '8471',
        unit: 'kg',
        sellingPrice: '199.99',
        purchasePrice: '149.99',
        mrp: '249.99',
        taxRate: '18',
      });

      expect(result.name).toBe('Widget');
      expect(result.sku).toBe('W001');
      expect(result.hsnCode).toBe('8471');
      expect(result.unit).toBe('kg');
      expect(result.sellingPrice).toBe(199.99);
      expect(result.purchasePrice).toBe(149.99);
      expect(result.mrp).toBe(249.99);
      expect(result.taxRate).toBe(18);
    });

    it('defaults unit to piece', () => {
      const result = service.normalizeProductRecord({ name: 'Item' });
      expect(result.unit).toBe('piece');
    });

    it('handles numeric and string price values', () => {
      const result1 = service.normalizeProductRecord({ name: 'A', sellingPrice: 100, mrp: 200 });
      expect(result1.sellingPrice).toBe(100);
      expect(result1.mrp).toBe(200);

      const result2 = service.normalizeProductRecord({ name: 'B', sellingPrice: '₹1,500', mrp: '₹2,000' });
      expect(result2.sellingPrice).toBe(1500);
      expect(result2.mrp).toBe(2000);
    });

    it('returns null for missing mrp', () => {
      const result = service.normalizeProductRecord({ name: 'No MRP' });
      expect(result.mrp).toBeNull();
    });
  });

  describe('normalizeInvoiceRecord', () => {
    it('detects GoGST format (gstin_of_recipient present)', () => {
      const result = service.normalizeInvoiceRecord({
        gstin_of_recipient: '27AABCU9603R1ZM',
        invoice_number: 'INV-001',
        invoice_date: '2024-01-15',
        invoice_value: 11800,
        rate: 18,
        taxable_value: 10000,
      });

      expect(result.format).toBe('gogst');
      expect(result.invoiceNo).toBe('INV-001');
      expect(result.customerGstin).toBe('27AABCU9603R1ZM');
    });

    it('detects simple format (invoiceNo present)', () => {
      const result = service.normalizeInvoiceRecord({
        invoiceNo: 'SIM-001',
        date: '2024-01-15',
        customerName: 'John Doe',
        customerPhone: '9876543210',
        items: [{ name: 'Item 1', quantity: 2, rate: 500, taxRate: 18 }],
        subtotal: 1000,
        taxAmount: 180,
        grandTotal: 1180,
      });

      expect(result.format).toBe('simple');
      expect(result.invoiceNo).toBe('SIM-001');
      expect(result.customerName).toBe('John Doe');
    });

    it('calculates taxAmount from rate and taxableValue in GoGST format', () => {
      const result = service.normalizeInvoiceRecord({
        gstin_of_recipient: '27AABCU9603R1ZM',
        invoice_number: 'INV-002',
        invoice_value: 11800,
        rate: 18,
        taxable_value: 10000,
      });

      expect(result.taxAmount).toBe(1800);
      expect(result.subtotal).toBe(10000);
    });

    it('handles missing items array in simple format', () => {
      const result = service.normalizeInvoiceRecord({
        invoiceNo: 'INV-003',
        customerName: 'Jane',
      });

      expect(result.format).toBe('simple');
      expect(result.items).toEqual([]);
    });
  });

  describe('parseIndianNumber', () => {
    it('parses plain numbers', () => {
      expect(service.parseIndianNumber(123)).toBe(123);
      expect(service.parseIndianNumber('456')).toBe(456);
    });

    it('handles comma-separated numbers (1,23,456)', () => {
      expect(service.parseIndianNumber('1,23,456')).toBe(123456);
    });

    it('handles rupee symbol', () => {
      expect(service.parseIndianNumber('₹1,23,456')).toBe(123456);
      expect(service.parseIndianNumber('₹1,00,000')).toBe(100000);
    });

    it('returns 0 for null, empty, non-numeric', () => {
      expect(service.parseIndianNumber(null)).toBe(0);
      expect(service.parseIndianNumber('')).toBe(0);
      expect(service.parseIndianNumber(undefined)).toBe(0);
      expect(service.parseIndianNumber('abc')).toBe(0);
    });

    it('parses float strings', () => {
      expect(service.parseIndianNumber('123.45')).toBe(123.45);
      expect(service.parseIndianNumber('₹1,234.56')).toBe(1234.56);
    });
  });

  describe('parseCsv', () => {
    it('parses CSV content correctly', () => {
      const csvContent = 'name,phone\nJohn,9876543210\nJane,1234567890';
      (parse as jest.Mock).mockReturnValue([
        { name: 'John', phone: '9876543210' },
        { name: 'Jane', phone: '1234567890' },
      ]);

      const result = service.parseCsv(Buffer.from(csvContent), 'data.csv');

      expect(result.headers).toEqual(['name', 'phone']);
      expect(result.totalRows).toBe(2);
      expect(result.detectedType).toBe('customers');
    });

    it('throws BadRequestException for empty files', () => {
      (parse as jest.Mock).mockReturnValue([]);

      expect(() => service.parseCsv(Buffer.from(''), 'empty.csv')).toThrow(BadRequestException);
    });

    it('handles Excel (.xlsx) files', () => {
      const mockWorkbook = { SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } };
      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        ['name', 'sku', 'mrp'],
        ['Product A', 'P001', '100'],
      ]);

      const result = service.parseCsv(Buffer.from('fake'), 'data.xlsx');

      expect(XLSX.read).toHaveBeenCalled();
      expect(result.totalRows).toBe(1);
    });

    it('throws BadRequestException for files with no sheets', () => {
      (XLSX.read as jest.Mock).mockReturnValue({ SheetNames: [], Sheets: {} });

      expect(() => service.parseCsv(Buffer.from('fake'), 'empty.xlsx')).toThrow(BadRequestException);
    });
  });

  describe('importCustomers', () => {
    it('creates customers successfully', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'c1' });

      const result = await service.importCustomers('biz1', [
        { name: 'Alice', phone: '1111111111' },
        { name: 'Bob', phone: '2222222222' },
      ]);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.customer.create).toHaveBeenCalledTimes(2);
    });

    it('skips duplicate phone numbers', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.importCustomers('biz1', [
        { name: 'Alice', phone: '1111111111' },
      ]);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('reports errors for missing name', async () => {
      const result = await service.importCustomers('biz1', [
        { phone: '1111111111' } as any,
      ]);

      expect(result.imported).toBe(0);
      expect(result.errors[0]).toContain('Missing customer name');
    });

    it('handles empty records array', async () => {
      const result = await service.importCustomers('biz1', []);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('importProducts', () => {
    it('creates products successfully', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({ id: 'p1' });

      const result = await service.importProducts('biz1', [
        { name: 'Widget A', sellingPrice: 100 },
        { name: 'Widget B', sellingPrice: 200 },
      ]);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it('skips duplicate product names', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.importProducts('biz1', [
        { name: 'Widget A' },
      ]);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('reports errors for missing name', async () => {
      const result = await service.importProducts('biz1', [
        { sellingPrice: 100 } as any,
      ]);

      expect(result.errors).toContain('Row 1: Missing product name');
    });
  });

  describe('importInvoices', () => {
    it('creates invoices with items', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'cust1' });
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.importInvoices('biz1', 'user1', [
        {
          invoiceNo: 'INV-001',
          customerName: 'John',
          items: [{ name: 'Item 1', quantity: 2, rate: 500, taxRate: 18 }],
          subtotal: 1000,
          taxAmount: 180,
          grandTotal: 1180,
        },
      ]);

      expect(result.imported).toBe(1);
      expect(mockPrisma.invoice.create).toHaveBeenCalledTimes(1);
    });

    it('matches customer by GSTIN, then phone, then name', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      // Match by GSTIN
      mockPrisma.customer.findFirst
        .mockResolvedValueOnce({ id: 'cust-gstin' });

      const result = await service.importInvoices('biz1', 'user1', [
        {
          invoiceNo: 'INV-GSTIN',
          customerGstin: '27AABCU9603R1ZM',
        },
      ]);

      expect(result.imported).toBe(1);
      const createCall = mockPrisma.invoice.create.mock.calls[0][0];
      expect(createCall.data.customerId).toBe('cust-gstin');
    });

    it('creates new customer if no match found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-cust' });

      const result = await service.importInvoices('biz1', 'user1', [
        {
          invoiceNo: 'INV-NEW',
          customerName: 'New Person',
          customerPhone: '9999999999',
        },
      ]);

      expect(result.imported).toBe(1);
      expect(mockPrisma.customer.create).toHaveBeenCalled();
    });

    it('skips duplicate invoice numbers', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({ id: 'existing' });

      const result = await service.importInvoices('biz1', 'user1', [
        { invoiceNo: 'INV-001' },
      ]);

      expect(result.skipped).toBe(1);
    });

    it('calculates CGST/SGST correctly', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust1' });
      mockPrisma.invoice.create.mockResolvedValue({ id: 'inv1' });

      await service.importInvoices('biz1', 'user1', [
        {
          invoiceNo: 'INV-TAX',
          customerName: 'Tax Customer',
          items: [{ name: 'Item', quantity: 1, rate: 10000, taxRate: 18 }],
        },
      ]);

      const createCall = mockPrisma.invoice.create.mock.calls[0][0];
      const item = createCall.data.items.create[0];
      expect(item.taxableValue).toBe(10000);
      expect(item.cgst).toBe(900);
      expect(item.sgst).toBe(900);
      expect(item.total).toBe(11800);
    });
  });
});
