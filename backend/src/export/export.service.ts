import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportCustomers(businessId: string): Promise<{ headers: string[]; rows: string[][] }> {
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const headers = ['Name', 'Phone', 'Email', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Opening Balance', 'Credit Limit', 'Balance', 'Status'];
    const rows: string[][] = customers.map((c) => [
      c.name,
      c.phone ?? '',
      c.email ?? '',
      c.gstin ?? '',
      c.address ?? '',
      c.city ?? '',
      c.state ?? '',
      c.pincode ?? '',
      String(c.openingBalance ?? 0),
      String(c.creditLimit ?? 0),
      String(c.balance ?? 0),
      c.isActive ? 'Active' : 'Inactive',
    ]);

    this.logger.log(`Exported ${rows.length} customers for business ${businessId}`);
    return { headers, rows };
  }

  async exportProducts(businessId: string): Promise<{ headers: string[]; rows: string[][] }> {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: 'asc' },
    });

    const headers = ['Name', 'SKU', 'HSN', 'Unit', 'Selling Price', 'Purchase Price', 'Tax Rate', 'Low Stock Threshold', 'Status'];
    const rows: string[][] = products.map((p) => [
      p.name,
      p.sku ?? '',
      p.hsnCode ?? '',
      p.unit,
      String(p.sellingPrice),
      String(p.purchasePrice ?? 0),
      `${p.taxRate}%`,
      String(p.lowStockThreshold ?? 10),
      p.isActive ? 'Active' : 'Inactive',
    ]);

    this.logger.log(`Exported ${rows.length} products for business ${businessId}`);
    return { headers, rows };
  }

  async exportInvoices(
    businessId: string,
    direction?: string,
  ): Promise<{ headers: string[]; rows: string[][] }> {
    const where: Record<string, unknown> = { businessId };
    if (direction) where.direction = direction;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true } }, supplier: { select: { name: true } } },
      orderBy: { invoiceDate: 'desc' },
    });

    const headers = [
      'Invoice No', 'Date', 'Type', 'Direction', 'Customer/Supplier', 'Document Type',
      'Subtotal', 'Tax Amount', 'Discount', 'Grand Total', 'Paid Amount', 'Balance', 'Status',
      'Customer GSTIN', 'Customer Phone', 'Customer State', 'Place of Supply',
      'PO No', 'Challan No', 'LR No', 'Payment Type', 'CESS Total', 'Total in Words',
      'Due Date', 'E-Way Bill No', 'Transporter', 'Vehicle No',
      'IRN', 'ACK No', 'ACK Date', 'Notes',
    ];
    const rows: string[][] = invoices.map((inv) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const party = inv.direction === 'SALE' ? inv.customer?.name ?? '' : inv.supplier?.name ?? '';
      const balance = (inv.grandTotal ?? 0) - (inv.paidAmount ?? 0);
      return [
        inv.invoiceNo,
        inv.invoiceDate.toISOString().slice(0, 10),
        inv.type,
        inv.direction,
        party,
        (inv as any).documentType || 'INVOICE',
        String(inv.subtotal ?? 0),
        String(inv.taxAmount ?? 0),
        String(inv.discount ?? 0),
        String(inv.grandTotal ?? 0),
        String(inv.paidAmount ?? 0),
        String(balance),
        inv.status,
        inv.customerGstin ?? '',
        inv.customerPhone ?? '',
        inv.customerState ?? '',
        inv.placeOfSupply ?? '',
        inv.poNo ?? '',
        inv.challanNo ?? '',
        inv.lrNo ?? '',
        inv.paymentType ?? '',
        String(inv.cessTotal ?? 0),
        inv.totalInWords ?? '',
        inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '',
        inv.ewayBillNo ?? '',
        inv.transporterName ?? '',
        inv.vehicleNo ?? '',
        inv.irn ?? '',
        inv.ackNo ?? '',
        inv.ackDate ? inv.ackDate.toISOString().slice(0, 10) : '',
        inv.notes ?? '',
      ];
    });

    this.logger.log(`Exported ${rows.length} invoices for business ${businessId}`);
    return { headers, rows };
  }

  async exportSuppliers(businessId: string): Promise<{ headers: string[]; rows: string[][] }> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
    });

    const headers = ['Name', 'Phone', 'Email', 'Address', 'GSTIN'];
    const rows: string[][] = suppliers.map((s) => [
      s.name,
      s.phone ?? '',
      s.email ?? '',
      s.address ?? '',
      s.gstin ?? '',
    ]);

    this.logger.log(`Exported ${rows.length} suppliers for business ${businessId}`);
    return { headers, rows };
  }

  async exportPayments(businessId: string): Promise<{ headers: string[]; rows: string[][] }> {
    const payments = await this.prisma.payment.findMany({
      where: { businessId },
      include: { invoice: { select: { invoiceNo: true } }, customer: { select: { name: true } } },
      orderBy: { paidAt: 'desc' },
    });

    const headers = ['Payment ID', 'Date', 'Invoice No', 'Customer', 'Amount', 'Method', 'Reference', 'Notes'];
    const rows: string[][] = payments.map((p) => [
      p.id,
      p.paidAt.toISOString().slice(0, 10),
      p.invoice?.invoiceNo ?? '',
      p.customer?.name ?? '',
      String(p.amount),
      p.method,
      p.reference ?? '',
      p.notes ?? '',
    ]);

    this.logger.log(`Exported ${rows.length} payments for business ${businessId}`);
    return { headers, rows };
  }

  toCsv(data: { headers: string[]; rows: string[][] }): string {
    const escapeCsv = (cell: string): string => {
      const escaped = cell.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(cell) || cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const lines = [
      data.headers.map(escapeCsv).join(','),
      ...data.rows.map((row) => row.map(escapeCsv).join(',')),
    ];
    return '\uFEFF' + lines.join('\n');
  }

  toJson(data: { headers: string[]; rows: string[][] }): string {
    const objects = data.rows.map((row) => {
      const obj: Record<string, string> = {};
      data.headers.forEach((h, i) => {
        obj[h] = row[i] ?? '';
      });
      return obj;
    });
    return JSON.stringify(objects, null, 2);
  }
}
