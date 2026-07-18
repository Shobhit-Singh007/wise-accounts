import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerImportDto,
  ProductImportDto,
  InvoiceImportDto,
  ImportResult,
  CsvParseResult,
} from './import.dto';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private prisma: PrismaService) {}

  normalizeCustomerRecord(record: any): {
    name: string;
    phone: string | null;
    email: string | null;
    gstin: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    openingBalance: number;
  } {
    const get = (key: string) =>
      record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)] ?? null;

    const name = get('name') || '';
    const phone = get('phone')
      ? String(get('phone')).replace(/[^0-9+]/g, '')
      : null;
    const email = get('email');
    const gstin = get('gstin');
    const address = get('address');
    const city = get('city');
    const state = get('state');
    const pincode = get('pincode');
    const openingBalance = this.parseIndianNumber(get('openingBalance'));

    return {
      name,
      phone,
      email,
      gstin,
      address,
      city,
      state,
      pincode,
      openingBalance,
    };
  }

  normalizeProductRecord(record: any): {
    name: string;
    sku: string | null;
    hsnCode: string | null;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
    mrp: number | null;
    taxRate: number;
  } {
    const get = (key: string) =>
      record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)] ?? null;

    const name = get('name') || '';
    const sku = get('sku');
    const hsnCode = get('hsnCode');
    const unit = get('unit') || 'piece';
    const sellingPrice = this.parseIndianNumber(get('sellingPrice'));
    const purchasePrice = this.parseIndianNumber(get('purchasePrice'));
    const mrp = get('mrp') != null ? this.parseIndianNumber(get('mrp')) : null;
    const taxRate = this.parseIndianNumber(get('taxRate'));

    return {
      name,
      sku,
      hsnCode,
      unit,
      sellingPrice,
      purchasePrice,
      mrp,
      taxRate,
    };
  }

  normalizeInvoiceRecord(record: any): {
    format: 'simple' | 'gogst';
    invoiceNo: string;
    invoiceDate: Date;
    customerName: string | null;
    customerPhone: string | null;
    customerGstin: string | null;
    items: { name: string; quantity: number; rate: number; taxRate: number }[];
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
    invoiceValue: number;
  } {
    const get = (key: string) =>
      record[key] ?? record[key.charAt(0).toUpperCase() + key.slice(1)] ?? null;

    const isGoGST = !!(
      get('gstin_of_recipient') ||
      get('invoice_number') ||
      get('invoice_value')
    );

    if (isGoGST) {
      const invoiceNo = String(
        get('invoice_number') || get('InvoiceNumber') || '',
      );
      const invoiceDate = get('invoice_date') || get('InvoiceDate');
      const customerGstin = get('gstin_of_recipient');
      const invoiceValue = this.parseIndianNumber(
        get('invoice_value') || get('InvoiceValue'),
      );
      const rate = this.parseIndianNumber(get('rate') || get('Rate'));
      const taxableValue = this.parseIndianNumber(
        get('taxable_value') || get('TaxableValue'),
      );

      const taxAmount =
        rate > 0 && taxableValue > 0
          ? parseFloat(((taxableValue * rate) / 100).toFixed(2))
          : 0;
      const subtotal = taxableValue || invoiceValue;
      const grandTotal = invoiceValue || subtotal + taxAmount;

      return {
        format: 'gogst',
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        customerName: null,
        customerPhone: null,
        customerGstin,
        items: [
          {
            name: `Item (GSTIN: ${customerGstin || 'N/A'})`,
            quantity: 1,
            rate: taxableValue || invoiceValue,
            taxRate: rate,
          },
        ],
        subtotal,
        taxAmount,
        grandTotal,
        invoiceValue,
      };
    }

    const invoiceNo = get('invoiceNo') || '';
    const invoiceDate = get('date');
    const customerName = get('customerName');
    const customerPhone = get('customerPhone')
      ? String(get('customerPhone')).replace(/[^0-9+]/g, '')
      : null;
    const rawItems = get('items');
    const items = Array.isArray(rawItems)
      ? rawItems.map((item: any) => ({
          name: item.name || item.Name || '',
          quantity: this.parseIndianNumber(item.quantity),
          rate: this.parseIndianNumber(item.rate),
          taxRate: this.parseIndianNumber(item.taxRate),
        }))
      : [];
    const subtotal = this.parseIndianNumber(get('subtotal'));
    const taxAmount = this.parseIndianNumber(get('taxAmount'));
    const grandTotal = this.parseIndianNumber(get('grandTotal'));

    return {
      format: 'simple',
      invoiceNo,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      customerName,
      customerPhone,
      customerGstin: null,
      items,
      subtotal,
      taxAmount,
      grandTotal,
      invoiceValue: grandTotal,
    };
  }

  parseIndianNumber(value: any): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[,₹\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  async importCustomers(
    businessId: string,
    records: CustomerImportDto[],
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      try {
        const normalized = this.normalizeCustomerRecord(records[i]);

        if (!normalized.name) {
          result.errors.push(`Row ${i + 1}: Missing customer name`);
          continue;
        }

        if (normalized.phone) {
          const existing = await this.prisma.customer.findFirst({
            where: { businessId, phone: normalized.phone },
          });
          if (existing) {
            result.skipped++;
            continue;
          }
        }

        await this.prisma.customer.create({
          data: {
            businessId,
            name: normalized.name,
            phone: normalized.phone,
            email: normalized.email,
            gstin: normalized.gstin,
            address: normalized.address,
            city: normalized.city,
            state: normalized.state,
            pincode: normalized.pincode,
            openingBalance: normalized.openingBalance,
            balance: normalized.openingBalance,
          },
        });

        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  async importProducts(
    businessId: string,
    records: ProductImportDto[],
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      try {
        const normalized = this.normalizeProductRecord(records[i]);

        if (!normalized.name) {
          result.errors.push(`Row ${i + 1}: Missing product name`);
          continue;
        }

        const existing = await this.prisma.product.findFirst({
          where: { businessId, name: normalized.name },
        });
        if (existing) {
          result.skipped++;
          continue;
        }

        await this.prisma.product.create({
          data: {
            businessId,
            name: normalized.name,
            sku: normalized.sku,
            hsnCode: normalized.hsnCode,
            unit: normalized.unit,
            sellingPrice: normalized.sellingPrice,
            purchasePrice: normalized.purchasePrice,
            mrp: normalized.mrp,
            taxRate: normalized.taxRate,
          },
        });

        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  async importInvoices(
    businessId: string,
    userId: string,
    records: InvoiceImportDto[],
  ): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      try {
        const normalized = this.normalizeInvoiceRecord(records[i]);

        if (!normalized.invoiceNo) {
          result.errors.push(`Row ${i + 1}: Missing invoice number`);
          continue;
        }

        const existingInvoice = await this.prisma.invoice.findFirst({
          where: { businessId, invoiceNo: normalized.invoiceNo },
        });
        if (existingInvoice) {
          result.skipped++;
          continue;
        }

        let customerId: string | null = null;

        if (normalized.customerGstin) {
          const customerByGstin = await this.prisma.customer.findFirst({
            where: { businessId, gstin: normalized.customerGstin },
          });
          if (customerByGstin) {
            customerId = customerByGstin.id;
          }
        }

        if (!customerId && normalized.customerPhone) {
          const customerByPhone = await this.prisma.customer.findFirst({
            where: { businessId, phone: normalized.customerPhone },
          });
          if (customerByPhone) {
            customerId = customerByPhone.id;
          }
        }

        if (!customerId && normalized.customerName) {
          const customerByName = await this.prisma.customer.findFirst({
            where: { businessId, name: normalized.customerName },
          });
          if (customerByName) {
            customerId = customerByName.id;
          }
        }

        if (
          !customerId &&
          (normalized.customerName ||
            normalized.customerPhone ||
            normalized.customerGstin)
        ) {
          const newCustomer = await this.prisma.customer.create({
            data: {
              businessId,
              name: normalized.customerName || 'Unknown Customer',
              phone: normalized.customerPhone,
              gstin: normalized.customerGstin,
            },
          });
          customerId = newCustomer.id;
        }

        const invoiceItems = normalized.items.map((item) => {
          const taxableValue = parseFloat(
            (item.quantity * item.rate).toFixed(2),
          );
          const taxRate = item.taxRate || 0;
          const halfTax = taxRate / 2;
          const cgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
          const sgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
          const igst = 0;
          const total = parseFloat(
            (taxableValue + cgst + sgst + igst).toFixed(2),
          );

          return {
            itemName: item.name,
            quantity: item.quantity,
            unit: 'piece',
            rate: item.rate,
            discount: 0,
            taxableValue,
            taxRate,
            cgst,
            sgst,
            igst,
            total,
          };
        });

        const subtotal =
          normalized.subtotal ||
          parseFloat(
            invoiceItems
              .reduce((sum, item) => sum + item.taxableValue, 0)
              .toFixed(2),
          );
        const taxAmount =
          normalized.taxAmount ||
          parseFloat(
            invoiceItems
              .reduce((sum, item) => sum + item.cgst + item.sgst + item.igst, 0)
              .toFixed(2),
          );
        const grandTotal =
          normalized.grandTotal ||
          parseFloat((subtotal + taxAmount).toFixed(2));

        const type = normalized.customerGstin ? 'B2B' : 'B2C';

        await this.prisma.invoice.create({
          data: {
            businessId,
            customerId,
            invoiceNo: normalized.invoiceNo,
            type: type as any,
            direction: 'SALE',
            invoiceDate: normalized.invoiceDate,
            subtotal,
            taxAmount,
            grandTotal,
            paidAmount: 0,
            status: 'CONFIRMED',
            createdById: userId,
            items: {
              create: invoiceItems,
            },
          },
        });

        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  parseCsv(fileBuffer: Buffer, originalFilename: string): CsvParseResult {
    const isExcel = /\.(xlsx|xls)$/i.test(originalFilename);
    let records: Record<string, string>[];

    if (isExcel) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException('Excel file has no sheets');
      }
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: false,
      }) as Record<string, string>[];
    } else {
      const content = fileBuffer.toString('utf-8');
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    }

    if (!records || records.length === 0) {
      throw new BadRequestException(
        'CSV file is empty or has no valid data rows',
      );
    }

    const headers = Object.keys(records[0]);
    const rows = records
      .slice(0, 10)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      .map((record) => headers.map((h) => record[h] ?? ''));

    const detectedType = this.detectFileType(headers);

    return {
      headers,
      rows,
      totalRows: records.length,
      detectedType,
    };
  }

  private detectFileType(
    headers: string[],
  ): 'customers' | 'products' | 'invoices' | 'unknown' {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    const customerIndicators = [
      'name',
      'phone',
      'email',
      'gstin',
      'address',
      'city',
      'state',
      'pincode',
      'opening balance',
    ];
    const productIndicators = [
      'name',
      'sku',
      'hsn',
      'hsncode',
      'unit',
      'selling price',
      'purchase price',
      'mrp',
      'tax rate',
    ];
    const invoiceIndicators = [
      'invoice',
      'invoiceno',
      'invoice_number',
      'invoice_date',
      'invoice_value',
      'gstin_of_recipient',
      'customername',
      'grand total',
      'taxable',
    ];

    const customerMatches = lowerHeaders.filter((h) =>
      customerIndicators.some((ci) => h.includes(ci)),
    ).length;
    const productMatches = lowerHeaders.filter((h) =>
      productIndicators.some((pi) => h.includes(pi)),
    ).length;
    const invoiceMatches = lowerHeaders.filter((h) =>
      invoiceIndicators.some((ii) => h.includes(ii)),
    ).length;

    const max = Math.max(customerMatches, productMatches, invoiceMatches);
    if (max === 0) return 'unknown';
    if (customerMatches === max) return 'customers';
    if (productMatches === max) return 'products';
    return 'invoices';
  }
}
