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

  private getNormalized(record: any, key: string): any {
    if (record[key] != null) return record[key];
    const lower = key.toLowerCase();
    const keys = Object.keys(record);
    for (const k of keys) {
      const normalized = k.toLowerCase().replace(/[\s_\-]/g, '');
      if (normalized === lower.replace(/[\s_\-]/g, '')) {
        return record[k];
      }
    }
    for (const k of keys) {
      const normalized = k.toLowerCase().replace(/[\s_\-]/g, '');
      if (normalized.includes(lower.replace(/[\s_\-]/g, '')) || lower.replace(/[\s_\-]/g, '').includes(normalized)) {
        return record[k];
      }
    }
    return null;
  }

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
    const get = (key: string) => this.getNormalized(record, key);

    const name = get('name') || '';
    const phone = get('phone') ? String(get('phone')).replace(/[^0-9+]/g, '') : null;
    const email = get('email');
    const gstin = get('gstin');
    const address = get('address');
    const city = get('city');
    const state = get('state');
    const pincode = get('pincode');
    const openingBalance = this.parseIndianNumber(get('openingBalance'));

    return { name, phone, email, gstin, address, city, state, pincode, openingBalance };
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
    const get = (key: string) => this.getNormalized(record, key);

    const name = get('name') || '';
    const sku = get('sku');
    const hsnCode = get('hsnCode');
    const unit = get('unit') || 'piece';
    const sellingPrice = this.parseIndianNumber(get('sellingPrice'));
    const purchasePrice = this.parseIndianNumber(get('purchasePrice'));
    const mrp = get('mrp') != null ? this.parseIndianNumber(get('mrp')) : null;
    const taxRate = this.parseIndianNumber(get('taxRate'));

    return { name, sku, hsnCode, unit, sellingPrice, purchasePrice, mrp, taxRate };
  }

  normalizeInvoiceRecord(record: any): {
    format: 'simple' | 'gogst';
    invoiceNo: string;
    invoiceDate: Date;
    customerName: string | null;
    customerPhone: string | null;
    customerGstin: string | null;
    customerAddress: string | null;
    customerState: string | null;
    placeOfSupply: string | null;
    reverseCharge: boolean;
    poNo: string | null;
    challanNo: string | null;
    lrNo: string | null;
    paymentType: string | null;
    paymentNote: string | null;
    cessTotal: number;
    totalInWords: string | null;
    ewayBillNo: string | null;
    ewayBillDate: Date | null;
    transporterId: string | null;
    transporterName: string | null;
    vehicleNo: string | null;
    irn: string | null;
    irnDate: Date | null;
    ackNo: string | null;
    ackDate: Date | null;
    notes: string | null;
    items: { name: string; productNote?: string; hsnCode?: string; quantity: number; rate: number; taxRate: number; taxableValue: number; cgstRate: number; sgstRate: number; igstRate: number; total: number; serialNo?: number }[];
    subtotal: number;
    taxAmount: number;
    grandTotal: number;
  } {
    const get = (key: string) => this.getNormalized(record, key);

    const isGoGST = !!(get('gstin') || get('gstin_of_recipient') || get('invoice_number') || get('invoice_value') || get('Invoice Id'));

    if (isGoGST) {
      const invoiceNo = String(get('invoice_number') || get('Invoice Id') || get('invoiceNo') || '');
      const invoiceDate = get('invoice_date') || get('Invoice Date') || get('date');
      const customerGstin = get('gstin_of_recipient') || get('gstin') || get('GST NO');
      const customerName = get('Company Name') || get('customerName') || get('customer_name') || get('Name');
      const customerPhone = get('Phone No') || get('customerPhone') || get('phone');
      const customerAddress = get('Address') || get('customerAddress') || get('address');
      const customerState = get('State') || get('customerState') || get('state');
      const placeOfSupply = get('Place of Supply') || get('place_of_supply') || get('placeOfSupply');
      const reverseCharge = get('Reverse Tax') === 'Yes' || get('reverse_charge') === 'Yes' || get('reverseCharge') === true;
      const poNo = get('PO No') || get('poNo') || get('po_number');
      const challanNo = get('Challan No') || get('challanNo') || get('challan_number');
      const lrNo = get('LR No') || get('lrNo') || get('lr_number');
      const paymentType = get('Payment Type') || get('paymentType') || get('payment_type');
      const cessTotal = this.parseIndianNumber(get('CESS Total') || get('cessTotal') || get('cess_total') || get('CESS Amount'));
      const totalInWords = get('Total in Words') || get('totalInWords') || get('total_in_words');
      const ewayBillNo = get('EWay No') || get('EWay Bill No') || get('ewayBillNo') || get('eway_bill_no');
      const ewayBillDate = get('EWay Bill Date') || get('ewayBillDate') || get('eway_bill_date');
      const transporterId = get('Transport Id') || get('transporterId') || get('transport_id');
      const transporterName = get('Transport Name') || get('transporterName') || get('transport_name');
      const vehicleNo = get('Vehicle No') || get('vehicleNo') || get('vehicle_no');
      const irn = get('IRN No') || get('irn') || get('irn_no');
      const irnDate = get('IRN Date') || get('irnDate') || get('irn_date');
      const ackNo = get('ACK No') || get('ackNo') || get('ack_no');
      const ackDate = get('ACK Date') || get('ackDate') || get('ack_date');
      const notes = get('Document Note') || get('notes') || get('document_note');

      const invoiceValue = this.parseIndianNumber(get('invoice_value') || get('Invoice Value') || get('Total') || get('total'));
      const rate = this.parseIndianNumber(get('rate') || get('Rate'));
      const taxableValue = this.parseIndianNumber(get('taxable_value') || get('Taxable Value') || get('Taxble Value Total') || get('taxableValue'));
      const cgstTotal = this.parseIndianNumber(get('CGST Total') || get('cgstTotal'));
      const sgstTotal = this.parseIndianNumber(get('SGST Total') || get('sgstTotal'));
      const igstTotal = this.parseIndianNumber(get('IGST Total') || get('igstTotal'));
      const grandTotal = this.parseIndianNumber(get('Grand Total') || get('grandTotal') || get('grand_total'));
      const subtotal = this.parseIndianNumber(get('subtotal') || get('Taxble Value Total') || taxableValue || invoiceValue);
      const taxAmount = this.parseIndianNumber(get('Tax Total') || get('taxAmount'))
        || (rate > 0 && taxableValue > 0 ? parseFloat(((taxableValue * rate) / 100).toFixed(2)) : 0)
        || (cgstTotal + sgstTotal + igstTotal);

      const items: any[] = [];
      const itemName = get('Product Name') || get('itemName') || get('productName') || get('product_name');
      if (itemName && itemName !== '--------') {
        items.push({
          name: itemName,
          productNote: get('Product Note') || get('productNote'),
          hsnCode: get('HSN/SAC Code') || get('hsnCode') || get('hsn'),
          quantity: this.parseIndianNumber(get('Quantity') || get('quantity') || 1),
          rate: this.parseIndianNumber(get('Rate') || get('rate')),
          taxableValue: this.parseIndianNumber(get('Taxable Value') || get('taxableValue') || taxableValue || 0),
          taxRate: rate || 0,
          cgstRate: this.parseIndianNumber(get('CGST Rate') || get('cgstRate')),
          sgstRate: this.parseIndianNumber(get('SGST Rate') || get('sgstRate')),
          igstRate: this.parseIndianNumber(get('IGST Rate') || get('igstRate')),
          total: this.parseIndianNumber(get('Item Total') || get('itemTotal') || get('total')),
          serialNo: this.parseIndianNumber(get('Serial No') || get('serialNo') || 0) || undefined,
        });
      }

      return {
        format: 'gogst',
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        customerName,
        customerPhone,
        customerGstin,
        customerAddress,
        customerState,
        placeOfSupply,
        reverseCharge,
        poNo,
        challanNo,
        lrNo,
        paymentType,
        paymentNote: get('Payment Note') || get('paymentNote'),
        cessTotal,
        totalInWords,
        ewayBillNo,
        ewayBillDate: ewayBillDate ? new Date(ewayBillDate) : null,
        transporterId,
        transporterName,
        vehicleNo,
        irn,
        irnDate: irnDate ? new Date(irnDate) : null,
        ackNo,
        ackDate: ackDate ? new Date(ackDate) : null,
        notes,
        items,
        subtotal,
        taxAmount,
        grandTotal: grandTotal || subtotal + taxAmount,
      };
    }

    const invoiceNo = get('invoiceNo') || '';
    const invoiceDate = get('date');
    const customerName = get('customerName');
    const customerPhone = get('customerPhone') ? String(get('customerPhone')).replace(/[^0-9+]/g, '') : null;
    const customerGstin = get('customerGstin') || get('gstin');
    const rawItems = get('items');
    const items = Array.isArray(rawItems)
      ? rawItems.map((item: any) => ({
          name: item.name || item.Name || '',
          productNote: item.productNote,
          hsnCode: item.hsnCode,
          quantity: this.parseIndianNumber(item.quantity),
          rate: this.parseIndianNumber(item.rate),
          taxableValue: this.parseIndianNumber(item.taxableValue || (item.quantity * item.rate)),
          taxRate: this.parseIndianNumber(item.taxRate),
          cgstRate: this.parseIndianNumber(item.cgstRate),
          sgstRate: this.parseIndianNumber(item.sgstRate),
          igstRate: this.parseIndianNumber(item.igstRate),
          total: this.parseIndianNumber(item.total),
          serialNo: item.serialNo,
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
      customerGstin,
      customerAddress: get('customerAddress'),
      customerState: get('customerState'),
      placeOfSupply: get('placeOfSupply'),
      reverseCharge: !!get('reverseCharge'),
      poNo: get('poNo'),
      challanNo: get('challanNo'),
      lrNo: get('lrNo'),
      paymentType: get('paymentType'),
      paymentNote: get('paymentNote'),
      cessTotal: this.parseIndianNumber(get('cessTotal')),
      totalInWords: get('totalInWords'),
      ewayBillNo: get('ewayBillNo'),
      ewayBillDate: get('ewayBillDate') ? new Date(get('ewayBillDate')) : null,
      transporterId: get('transporterId'),
      transporterName: get('transporterName'),
      vehicleNo: get('vehicleNo'),
      irn: get('irn'),
      irnDate: get('irnDate') ? new Date(get('irnDate')) : null,
      ackNo: get('ackNo'),
      ackDate: get('ackDate') ? new Date(get('ackDate')) : null,
      notes: get('notes'),
      items,
      subtotal,
      taxAmount,
      grandTotal: grandTotal || subtotal + taxAmount,
    };
  }

  parseIndianNumber(value: any): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[,₹\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private async findOrCreateCustomer(businessId: string, data: {
    name: string | null;
    phone: string | null;
    gstin: string | null;
    address: string | null;
    state: string | null;
  }): Promise<string | null> {
    if (!data.name && !data.phone && !data.gstin) return null;

    if (data.gstin) {
      const existing = await this.prisma.customer.findFirst({
        where: { businessId, gstin: data.gstin },
      });
      if (existing) return existing.id;
    }
    if (data.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: { businessId, phone: data.phone },
      });
      if (existing) {
        if (data.gstin && !existing.gstin) {
          await this.prisma.customer.update({ where: { id: existing.id }, data: { gstin: data.gstin } });
        }
        return existing.id;
      }
    }
    if (data.name) {
      const existing = await this.prisma.customer.findFirst({
        where: { businessId, name: data.name },
      });
      if (existing) return existing.id;
    }

    const created = await this.prisma.customer.create({
      data: {
        businessId,
        name: data.name || 'Unknown',
        phone: data.phone,
        gstin: data.gstin,
        address: data.address,
        state: data.state,
      },
    });
    return created.id;
  }

  private async findOrCreateProduct(businessId: string, data: {
    name: string;
    hsnCode?: string;
    unit?: string;
    sellingPrice?: number;
    taxRate?: number;
  }): Promise<{ id: string; name: string; hsnCode: string | null; unit: string; taxRate: number } | null> {
    if (!data.name) return null;

    const existing = await this.prisma.product.findFirst({
      where: { businessId, name: data.name },
    });
    if (existing) return existing;

    const created = await this.prisma.product.create({
      data: {
        businessId,
        name: data.name,
        hsnCode: data.hsnCode,
        unit: data.unit || 'piece',
        sellingPrice: data.sellingPrice || 0,
        taxRate: data.taxRate || 0,
      },
    });
    return created;
  }

  private parseGoGSTDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/);
    if (parts) {
      const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
      const month = months[parts[2].toLowerCase()];
      if (month !== undefined) {
        let year = parseInt(parts[3]);
        if (year < 100) year += 2000;
        return new Date(year, month, parseInt(parts[1]));
      }
    }
    return new Date();
  }

  async importCustomers(businessId: string, records: CustomerImportDto[]): Promise<ImportResult> {
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
          if (existing) { result.skipped++; continue; }
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

  async importProducts(businessId: string, records: ProductImportDto[]): Promise<ImportResult> {
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
        if (existing) { result.skipped++; continue; }
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

  async importInvoices(businessId: string, userId: string, records: InvoiceImportDto[]): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    const grouped = this.groupGoGSTRecords(records);
    let globalRow = 0;

    for (const group of grouped) {
      globalRow++;
      try {
        const header = group.header;
        const lineItems = group.items;

        const invoiceData = this.normalizeInvoiceRecord(header);

        if (!invoiceData.invoiceNo) {
          result.errors.push(`Row ${globalRow}: Missing invoice number`);
          continue;
        }

        const existingInvoice = await this.prisma.invoice.findFirst({
          where: { businessId, invoiceNo: invoiceData.invoiceNo },
        });
        if (existingInvoice) {
          result.skipped++;
          continue;
        }

        const customerId = await this.findOrCreateCustomer(businessId, {
          name: invoiceData.customerName,
          phone: invoiceData.customerPhone,
          gstin: invoiceData.customerGstin,
          address: invoiceData.customerAddress,
          state: invoiceData.customerState,
        });

        const invoiceItems: any[] = [];

        if (lineItems.length > 0) {
          for (const item of lineItems) {
            const itemData = this.normalizeInvoiceRecord(item);
            for (const li of itemData.items) {
              const product = await this.findOrCreateProduct(businessId, {
                name: li.name,
                hsnCode: li.hsnCode,
                unit: undefined,
                sellingPrice: li.rate,
                taxRate: li.taxRate,
              });

              const taxableValue = li.taxableValue || parseFloat((li.quantity * li.rate).toFixed(2));
              const halfTax = li.taxRate / 2;
              const cgst = li.cgstRate ? parseFloat(((taxableValue * li.cgstRate) / 100).toFixed(2)) : parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
              const sgst = li.sgstRate ? parseFloat(((taxableValue * li.sgstRate) / 100).toFixed(2)) : parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
              const igst = li.igstRate ? parseFloat(((taxableValue * li.igstRate) / 100).toFixed(2)) : 0;
              const total = li.total || parseFloat((taxableValue + cgst + sgst + igst).toFixed(2));

              invoiceItems.push({
                productId: product?.id,
                itemName: li.name,
                quantity: li.quantity,
                unit: product?.unit || 'piece',
                rate: li.rate,
                discount: 0,
                taxableValue,
                taxRate: li.taxRate,
                cgst,
                sgst,
                igst,
                total,
                productNote: li.productNote,
                cgstRate: li.cgstRate,
                sgstRate: li.sgstRate,
                igstRate: li.igstRate,
                serialNo: li.serialNo,
              });
            }
          }
        } else {
          for (const li of invoiceData.items) {
            const product = await this.findOrCreateProduct(businessId, {
              name: li.name,
              sellingPrice: li.rate,
              taxRate: li.taxRate,
            });
            const taxableValue = li.taxableValue || parseFloat((li.quantity * li.rate).toFixed(2));
            const halfTax = li.taxRate / 2;
            const cgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
            const sgst = parseFloat(((taxableValue * halfTax) / 100).toFixed(2));
            const total = li.total || parseFloat((taxableValue + cgst + sgst).toFixed(2));
            invoiceItems.push({
              productId: product?.id,
              itemName: li.name,
              quantity: li.quantity,
              unit: product?.unit || 'piece',
              rate: li.rate,
              discount: 0,
              taxableValue,
              taxRate: li.taxRate,
              cgst,
              sgst,
              igst: 0,
              total,
              cgstRate: li.cgstRate,
              sgstRate: li.sgstRate,
              igstRate: li.igstRate,
              serialNo: li.serialNo,
            });
          }
        }

        const subtotal = invoiceData.subtotal || parseFloat(invoiceItems.reduce((s, i) => s + i.taxableValue, 0).toFixed(2));
        const taxAmount = invoiceData.taxAmount || parseFloat(invoiceItems.reduce((s, i) => s + i.cgst + i.sgst + i.igst, 0).toFixed(2));
        const grandTotal = invoiceData.grandTotal || parseFloat((subtotal + taxAmount).toFixed(2));

        const type = invoiceData.customerGstin ? 'B2B' as const : 'B2C' as const;

        await this.prisma.invoice.create({
          data: {
            businessId,
            customerId,
            invoiceNo: invoiceData.invoiceNo,
            type,
            direction: 'SALE',
            invoiceDate: invoiceData.invoiceDate,
            dueDate: undefined,
            subtotal,
            taxAmount,
            discount: 0,
            grandTotal,
            paidAmount: 0,
            status: 'CONFIRMED',
            notes: invoiceData.notes,
            customerAddress: invoiceData.customerAddress,
            customerPhone: invoiceData.customerPhone,
            customerState: invoiceData.customerState,
            placeOfSupply: invoiceData.placeOfSupply,
            reverseCharge: invoiceData.reverseCharge,
            poNo: invoiceData.poNo,
            challanNo: invoiceData.challanNo,
            lrNo: invoiceData.lrNo,
            paymentType: invoiceData.paymentType,
            paymentNote: invoiceData.paymentNote,
            cessTotal: invoiceData.cessTotal,
            totalInWords: invoiceData.totalInWords,
            ewayBillNo: invoiceData.ewayBillNo,
            ewayBillDate: invoiceData.ewayBillDate,
            transporterId: invoiceData.transporterId,
            transporterName: invoiceData.transporterName,
            vehicleNo: invoiceData.vehicleNo,
            irn: invoiceData.irn,
            irnDate: invoiceData.irnDate,
            ackNo: invoiceData.ackNo,
            ackDate: invoiceData.ackDate,
            paymentType: invoiceData.paymentType,
            cessTotal: invoiceData.cessTotal,
            totalInWords: invoiceData.totalInWords,
            createdById: userId,
            items: { create: invoiceItems },
          },
        });

        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${globalRow}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  private groupGoGSTRecords(records: any[]): { header: any; items: any[] }[] {
    const groups: { header: any; items: any[] }[] = [];
    let currentHeader: any | null = null;
    let currentItems: any[] = [];

    for (const record of records) {
      const firstVal = Object.values(record)[0];
      const isItemRow = String(firstVal).trim() === '--------';
      const hasInvoiceId = !isItemRow && /^\d+$/.test(String(firstVal).trim());

      if (hasInvoiceId) {
        if (currentHeader) {
          groups.push({ header: currentHeader, items: currentItems });
        }
        currentHeader = record;
        currentItems = [];
      } else if (isItemRow && currentHeader) {
        const hasProductName = Object.values(record).some(v => String(v).trim() && String(v).trim() !== '--------');
        if (hasProductName) {
          currentItems.push(record);
        }
      } else if (!isItemRow && !currentHeader) {
        currentHeader = record;
        currentItems = [];
      }
    }

    if (currentHeader) {
      groups.push({ header: currentHeader, items: currentItems });
    }

    return groups;
  }

  parseCsv(fileBuffer: Buffer, originalFilename: string): CsvParseResult {
    const isExcel = /\.(xlsx|xls)$/i.test(originalFilename);
    let records: Record<string, string>[];

    if (isExcel) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new BadRequestException('Excel file has no sheets');
      const sheet = workbook.Sheets ? workbook.Sheets[sheetName] : null;
      if (!sheet) throw new BadRequestException('Excel sheet not found');
      records = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as Record<string, string>[];
    } else {
      const content = fileBuffer.toString('utf-8');
      records = parse(content, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
    }

    if (!records || records.length === 0) {
      throw new BadRequestException('File is empty or has no valid data rows');
    }

    const grouped = this.groupGoGSTRecords(records);
    if (grouped.length > 0 && grouped[0].items.length > 0) {
      const headers = Object.keys(grouped[0].header);
      const rows = grouped.slice(0, 10).map((g) => headers.map((h) => g.header[h] ?? ''));
      const detectedType = this.detectFileType(headers);
      return { headers, rows, totalRows: grouped.length, detectedType };
    }

    const headers = Object.keys(records[0]);
    const rows = records.slice(0, 10).map((record) => headers.map((h) => record[h] ?? ''));
    const detectedType = this.detectFileType(headers);
    return { headers, rows, totalRows: records.length, detectedType };
  }

  private detectFileType(headers: string[]): 'customers' | 'products' | 'invoices' | 'unknown' {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
    const customerIndicators = ['name', 'phone', 'email', 'gstin', 'address', 'city', 'state', 'pincode', 'opening balance'];
    const productIndicators = ['name', 'sku', 'hsn', 'hsncode', 'unit', 'selling price', 'purchase price', 'mrp', 'tax rate'];
    const invoiceIndicators = ['invoice', 'invoiceno', 'invoice_number', 'invoice_date', 'invoice_value', 'gstin_of_recipient', 'customername', 'grand total', 'taxable', 'company name', 'gst no', 'eway no'];

    const customerMatches = lowerHeaders.filter((h) => customerIndicators.some((ci) => h.includes(ci))).length;
    const productMatches = lowerHeaders.filter((h) => productIndicators.some((pi) => h.includes(pi))).length;
    const invoiceMatches = lowerHeaders.filter((h) => invoiceIndicators.some((ii) => h.includes(ii))).length;

    const max = Math.max(customerMatches, productMatches, invoiceMatches);
    if (max === 0) return 'unknown';
    if (customerMatches === max) return 'customers';
    if (productMatches === max) return 'products';
    return 'invoices';
  }
}
