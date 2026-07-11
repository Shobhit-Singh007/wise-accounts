import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(businessId: string, startDate?: string, endDate?: string) {
    const where: any = { businessId, status: 'CONFIRMED' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });

    const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const totalTax = invoices.reduce((sum, inv) => sum + inv.taxAmount, 0);
    const totalInvoices = invoices.length;

    const categorySales: Record<string, { count: number; total: number }> = {};
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const catName = item.itemName;
        if (!categorySales[catName]) categorySales[catName] = { count: 0, total: 0 };
        categorySales[catName].count += item.quantity;
        categorySales[catName].total += item.total;
      }
    }

    return {
      period: { startDate, endDate },
      summary: { totalSales, totalTax, totalInvoices, averageInvoice: totalSales / (totalInvoices || 1) },
      categorySales: Object.entries(categorySales).map(([name, data]) => ({ name, ...data })),
      invoices,
    };
  }

  async getGstr1(businessId: string, fromDate: string, toDate: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: 'CONFIRMED',
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
      include: { items: true, customer: true },
      orderBy: { createdAt: 'asc' },
    });

    const b2bInvoices = invoices.filter((i) => i.type === 'B2B');
    const b2cInvoices = invoices.filter((i) => i.type === 'B2C');

    return {
      fromDate,
      toDate,
      summary: {
        totalInvoices: invoices.length,
        totalTaxableValue: invoices.reduce((s, i) => s + i.subtotal, 0),
        totalTax: invoices.reduce((s, i) => s + i.taxAmount, 0),
      },
      b2b: b2bInvoices.map((inv) => ({
        invoiceNo: inv.invoiceNo,
        date: inv.invoiceDate,
        customerName: inv.customer?.name,
        customerGstin: inv.customer?.gstin,
        taxableValue: inv.subtotal,
        taxAmount: inv.taxAmount,
        grandTotal: inv.grandTotal,
      })),
      b2c: {
        count: b2cInvoices.length,
        totalTaxableValue: b2cInvoices.reduce((s, i) => s + i.subtotal, 0),
        totalTax: b2cInvoices.reduce((s, i) => s + i.taxAmount, 0),
      },
    };
  }

  async getGstr3b(businessId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: 'CONFIRMED',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalSales = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
    const totalInvoices = invoices.length;

    return {
      month,
      year,
      summary: {
        totalInvoices,
        totalTaxableValue: totalSales,
        totalTax,
        totalPaid: invoices.reduce((s, i) => s + i.paidAmount, 0),
        outstanding: invoices.reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0),
      },
    };
  }

  async getHsnReport(businessId: string, fromDate?: string, toDate?: string) {
    const where: any = { businessId, status: 'CONFIRMED' };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: true },
    });

    const hsnMap: Record<string, {
      hsnCode: string;
      description: string;
      uom: string;
      totalQuantity: number;
      totalValue: number;
      totalTaxableValue: number;
      totalCgst: number;
      totalSgst: number;
      totalIgst: number;
    }> = {};

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const hsn = item.itemName;
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn,
            description: item.itemName,
            uom: item.unit,
            totalQuantity: 0,
            totalValue: 0,
            totalTaxableValue: 0,
            totalCgst: 0,
            totalSgst: 0,
            totalIgst: 0,
          };
        }
        hsnMap[hsn].totalQuantity += item.quantity;
        hsnMap[hsn].totalValue += item.total;
        hsnMap[hsn].totalTaxableValue += item.taxableValue;
        hsnMap[hsn].totalCgst += item.cgst;
        hsnMap[hsn].totalSgst += item.sgst;
        hsnMap[hsn].totalIgst += item.igst;
      }
    }

    return { items: Object.values(hsnMap) };
  }

  async getCustomerReport(businessId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { businessId, isActive: true },
      include: {
        _count: { select: { invoices: true, payments: true } },
      },
      orderBy: { balance: 'desc' },
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      creditLimit: c.creditLimit,
      balance: c.balance,
      totalInvoices: c._count.invoices,
      totalPayments: c._count.payments,
    }));
  }

  async getProfitLoss(businessId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = { businessId, status: 'CONFIRMED' };
    if (Object.keys(dateFilter).length) where.createdAt = dateFilter;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: true },
    });

    const revenue = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalSales = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
    const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0);

    return {
      revenue,
      totalSales,
      totalTax,
      totalDiscount,
      netProfit: revenue,
      invoiceCount: invoices.length,
    };
  }
}
