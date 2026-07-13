import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(businessId: string, startDate?: string, endDate?: string) {
    const where: any = { businessId, status: 'CONFIRMED' };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = new Date(startDate);
      if (endDate) where.invoiceDate.lte = new Date(endDate);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: { include: { product: true } }, customer: true, business: true },
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
        direction: 'SALE',
        invoiceDate: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const b2bInvoices = invoices.filter(i => i.type === 'B2B');
    const b2b = b2bInvoices.map(inv => ({
      customerGstin: inv.customer?.gstin || null,
      customerName: inv.customer?.name || 'Unknown',
      invoiceNo: inv.invoiceNo,
      date: (inv.invoiceDate || inv.createdAt).toISOString(),
      invoiceValue: inv.grandTotal,
      placeOfSupply: inv.customer?.state || 'Unknown',
      reverseCharge: false,
      taxableValue: inv.subtotal,
      cgst: inv.items.reduce((s, i) => s + i.cgst, 0),
      sgst: inv.items.reduce((s, i) => s + i.sgst, 0),
      igst: inv.items.reduce((s, i) => s + i.igst, 0),
      cess: 0,
      taxAmount: inv.taxAmount,
      grandTotal: inv.grandTotal,
    }));

    const b2cLargeInvoices = invoices.filter(i =>
      i.type === 'B2C' && i.grandTotal > 250000 && !i.customer?.gstin
    );
    const b2cLarge = b2cLargeInvoices.map(inv => ({
      placeOfSupply: inv.customer?.state || 'Unknown',
      rate: inv.items[0]?.taxRate || 0,
      taxableValue: inv.subtotal,
      cgst: inv.items.reduce((s, i) => s + i.cgst, 0),
      sgst: inv.items.reduce((s, i) => s + i.sgst, 0),
      igst: inv.items.reduce((s, i) => s + i.igst, 0),
      cess: 0,
    }));

    const b2cSmallInvoices = invoices.filter(i =>
      i.type === 'B2C' && i.grandTotal <= 250000 && !i.customer?.gstin
    );
    const b2cSmallMap: Record<string, { placeOfSupply: string; rate: number; taxableValue: number; cgst: number; sgst: number; igst: number; cess: number }> = {};
    for (const inv of b2cSmallInvoices) {
      const pos = inv.customer?.state || 'Unknown';
      const rate = inv.items[0]?.taxRate || 0;
      const key = `${pos}-${rate}`;
      if (!b2cSmallMap[key]) {
        b2cSmallMap[key] = { placeOfSupply: pos, rate, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
      }
      b2cSmallMap[key].taxableValue += inv.subtotal;
      b2cSmallMap[key].cgst += inv.items.reduce((s, i) => s + i.cgst, 0);
      b2cSmallMap[key].sgst += inv.items.reduce((s, i) => s + i.sgst, 0);
      b2cSmallMap[key].igst += inv.items.reduce((s, i) => s + i.igst, 0);
    }
    const b2cSmall = Object.values(b2cSmallMap);

    const hsnMap: Record<string, {
      hsnCode: string; description: string; uqc: string;
      totalQuantity: number; totalValue: number; taxableValue: number;
      cgst: number; sgst: number; igst: number; cess: number;
    }> = {};
    for (const inv of invoices) {
      for (const item of inv.items as any[]) {
        const hsn = item.product?.hsnCode || '9999';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnCode: hsn, description: item.itemName, uqc: item.unit || 'NOS',
            totalQuantity: 0, totalValue: 0, taxableValue: 0,
            cgst: 0, sgst: 0, igst: 0, cess: 0,
          };
        }
        hsnMap[hsn].totalQuantity += item.quantity;
        hsnMap[hsn].totalValue += item.total;
        hsnMap[hsn].taxableValue += item.taxableValue;
        hsnMap[hsn].cgst += item.cgst;
        hsnMap[hsn].sgst += item.sgst;
        hsnMap[hsn].igst += item.igst;
      }
    }

    const documentSummary = {
      invoicesIssued: { count: invoices.length, totalValue: invoices.reduce((s, i) => s + i.grandTotal, 0) },
      creditNotes: { count: 0, totalValue: 0 },
    };

    return {
      fromDate,
      toDate,
      filingPeriod: `${new Date(fromDate).toLocaleString('en-IN', { month: 'long' })} ${new Date(fromDate).getFullYear()}`,
      summary: {
        totalInvoices: invoices.length,
        totalTaxableValue: invoices.reduce((s, i) => s + i.subtotal, 0),
        totalCgst: invoices.reduce((s, i) => s + i.items.reduce((a, b) => a + b.cgst, 0), 0),
        totalSgst: invoices.reduce((s, i) => s + i.items.reduce((a, b) => a + b.sgst, 0), 0),
        totalIgst: invoices.reduce((s, i) => s + i.items.reduce((a, b) => a + b.igst, 0), 0),
        totalCess: 0,
        totalTax: invoices.reduce((s, i) => s + i.taxAmount, 0),
        b2bCount: b2bInvoices.length,
        b2cLargeCount: b2cLargeInvoices.length,
        b2cSmallCount: b2cSmallInvoices.length,
        reverseChargeInvoices: 0,
      },
      b2b,
      b2cLarge,
      b2cSmall,
      hsnSummary: Object.values(hsnMap),
      documents: documentSummary,
    };
  }

  async getGstr3b(businessId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: 'CONFIRMED',
        direction: 'SALE',
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    const payments = await this.prisma.payment.findMany({
      where: { businessId, status: 'COMPLETED', paidAt: { gte: startDate, lte: endDate } },
    });

    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    const businessState = business?.state || '';

    const taxableIntraState = invoices.filter(i => {
      const customerState = i.customer?.state || '';
      return !customerState || customerState === businessState;
    });
    const taxableInterState = invoices.filter(i => {
      const customerState = i.customer?.state || '';
      return customerState && customerState !== businessState;
    });

    const table3_1 = {
      outwardTaxableIntraState: {
        totalTaxableValue: taxableIntraState.reduce((s, i) => s + i.subtotal, 0),
        totalIgst: 0,
        totalCgst: taxableIntraState.reduce((s, i) => s + i.items.reduce((a, b) => a + b.cgst, 0), 0),
        totalSgst: taxableIntraState.reduce((s, i) => s + i.items.reduce((a, b) => a + b.sgst, 0), 0),
        totalCess: 0,
      },
      outwardTaxableInterState: {
        totalTaxableValue: taxableInterState.reduce((s, i) => s + i.subtotal, 0),
        totalIgst: taxableInterState.reduce((s, i) => s + i.items.reduce((a, b) => a + b.igst, 0), 0),
        totalCgst: 0,
        totalSgst: 0,
        totalCess: 0,
      },
      outwardZeroRated: { totalTaxableValue: 0, totalIgst: 0, totalCess: 0 },
      outwardNilRated: { totalTaxableValue: 0, totalIgst: 0, totalCess: 0 },
      outwardExempt: { totalTaxableValue: 0, totalIgst: 0, totalCess: 0 },
      nonGstOutward: { totalTaxableValue: 0, totalIgst: 0, totalCess: 0 },
      reverseCharge: {
        taxableValue: 0,
        igst: 0, cgst: 0, sgst: 0, cess: 0,
      },
    };

    const table3_2 = {
      interStateSupplies: taxableInterState.map(inv => ({
        placeOfSupply: inv.customer?.state || 'Unknown',
        totalTaxableValue: inv.subtotal,
        totalIgst: inv.items.reduce((s, i) => s + i.igst, 0),
      })),
    };

    const table4 = {
      importOfGoods: { integrated: 0, central: 0, state: 0, cess: 0 },
      importOfServices: { integrated: 0, central: 0, state: 0, cess: 0 },
      inwardTaxableSupplies: { integrated: 0, central: 0, state: 0, cess: 0 },
      inwardTaxableSuppliesFromComposition: { integrated: 0, central: 0, state: 0, cess: 0 },
      inwardTaxableSuppliesExempt: { integrated: 0, central: 0, state: 0, cess: 0 },
      totalItcAvailable: { integrated: 0, central: 0, state: 0, cess: 0 },
      itcReversed: { integrated: 0, central: 0, state: 0, cess: 0 },
      netItcAvailable: { integrated: 0, central: 0, state: 0, cess: 0 },
    };

    const table5 = {
      nilRated: { totalTaxableValue: 0, totalIgst: 0, totalCgst: 0, totalSgst: 0, totalCess: 0 },
      exempt: { totalTaxableValue: 0, totalIgst: 0, totalCgst: 0, totalSgst: 0, totalCess: 0 },
      nonGst: { totalTaxableValue: 0, totalIgst: 0, totalCgst: 0, totalSgst: 0, totalCess: 0 },
    };

    const totalTaxPayable =
      table3_1.outwardTaxableIntraState.totalCgst +
      table3_1.outwardTaxableIntraState.totalSgst +
      table3_1.outwardTaxableInterState.totalIgst;

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    const table6 = {
      taxPayable: {
        cgst: table3_1.outwardTaxableIntraState.totalCgst,
        sgst: table3_1.outwardTaxableIntraState.totalSgst,
        igst: table3_1.outwardTaxableInterState.totalIgst,
        cess: 0,
        interest: 0,
        lateFee: 0,
        total: totalTaxPayable,
      },
      taxPaid: {
        cgst: 0, sgst: 0, igst: 0, cess: 0,
        interest: 0, lateFee: 0,
        total: totalPaid,
      },
      taxBalance: {
        cgst: table3_1.outwardTaxableIntraState.totalCgst,
        sgst: table3_1.outwardTaxableIntraState.totalSgst,
        igst: table3_1.outwardTaxableInterState.totalIgst,
        cess: 0,
        total: Math.max(0, totalTaxPayable - totalPaid),
      },
    };

    return {
      month,
      year,
      filingPeriod: `${new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' })} ${year}`,
      summary: {
        totalInvoices: invoices.length,
        totalTaxableValue: invoices.reduce((s, i) => s + i.subtotal, 0),
        totalTax: invoices.reduce((s, i) => s + i.taxAmount, 0),
        totalCgst: table3_1.outwardTaxableIntraState.totalCgst,
        totalSgst: table3_1.outwardTaxableIntraState.totalSgst,
        totalIgst: table3_1.outwardTaxableInterState.totalIgst,
        totalPaid: totalPaid,
        outstanding: Math.max(0, totalTaxPayable - totalPaid),
      },
      outwardSupplies: [
        { label: 'Outward taxable supplies (other than zero rated, nil rated and exempted)', taxableValue: table3_1.outwardTaxableIntraState.totalTaxableValue + table3_1.outwardTaxableInterState.totalTaxableValue, igst: table3_1.outwardTaxableInterState.totalIgst, cgst: table3_1.outwardTaxableIntraState.totalCgst, sgst: table3_1.outwardTaxableIntraState.totalSgst, cess: 0 },
        { label: 'Outward taxable supplies (zero rated, nil rated and exempted)', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Non-GST outward supplies', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Taxable supplies under reverse charge', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
      ],
      interStateSupplies: table3_2.interStateSupplies.map(s => ({
        placeOfSupply: s.placeOfSupply,
        taxableValue: s.totalTaxableValue,
        igst: s.totalIgst,
      })),
      eligibleItc: [
        { label: 'Import of goods', igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Import of services', igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Inward supplies (other than imports)', igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Total ITC available', igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'ITC Reversed', igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Net ITC available', igst: 0, cgst: 0, sgst: 0, cess: 0 },
      ],
      exemptNilNonGst: [
        { label: 'Nil rated supplies', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Exempt supplies', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        { label: 'Non-GST supplies', taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
      ],
      paymentOfTax: [
        { label: 'Tax Payable', cgst: table6.taxPayable.cgst, sgst: table6.taxPayable.sgst, igst: table6.taxPayable.igst, cess: table6.taxPayable.cess, interest: table6.taxPayable.interest, lateFee: table6.taxPayable.lateFee, total: table6.taxPayable.total },
        { label: 'Tax Paid', cgst: table6.taxPaid.cgst, sgst: table6.taxPaid.sgst, igst: table6.taxPaid.igst, cess: table6.taxPaid.cess, interest: table6.taxPaid.interest, lateFee: table6.taxPaid.lateFee, total: table6.taxPaid.total },
        { label: 'Tax Balance', cgst: table6.taxBalance.cgst, sgst: table6.taxBalance.sgst, igst: table6.taxBalance.igst, cess: table6.taxBalance.cess, interest: 0, lateFee: 0, total: table6.taxBalance.total },
      ],
    };
  }

  async getHsnReport(businessId: string, fromDate?: string, toDate?: string) {
    const where: any = { businessId, status: 'CONFIRMED' };
    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) where.invoiceDate.gte = new Date(fromDate);
      if (toDate) where.invoiceDate.lte = new Date(toDate);
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
      for (const item of invoice.items as any[]) {
        const hsn = item.product?.hsnCode || '9999';
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
    if (Object.keys(dateFilter).length) where.invoiceDate = dateFilter;

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: { items: { include: { product: true } } },
    });

    const revenue = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalSales = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalTax = invoices.reduce((s, i) => s + i.taxAmount, 0);
    const totalDiscount = invoices.reduce((s, i) => s + i.discount, 0);

    const totalCost = invoices.reduce((s, i) => s + i.items.reduce((a, b) => a + (b.product?.purchasePrice || 0) * b.quantity, 0), 0);

    return {
      revenue,
      totalSales,
      totalTax,
      totalDiscount,
      totalCost,
      netProfit: revenue - totalCost,
      invoiceCount: invoices.length,
    };
  }

  async getProductReport(businessId: string, startDate?: string, endDate?: string) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const invoiceWhere: any = { businessId, status: 'CONFIRMED' };
    if (Object.keys(dateFilter).length) invoiceWhere.invoiceDate = dateFilter;

    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      include: { items: { include: { product: true } } },
    });

    const productMap: Record<string, {
      productId: string;
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      totalTax: number;
      invoiceCount: number;
    }> = {};

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const key = item.productId || item.itemName;
        if (!productMap[key]) {
          productMap[key] = {
            productId: item.productId || 'N/A',
            name: item.itemName,
            totalQuantity: 0,
            totalRevenue: 0,
            totalTax: 0,
            invoiceCount: 0,
          };
        }
        productMap[key].totalQuantity += item.quantity;
        productMap[key].totalRevenue += item.total;
        productMap[key].totalTax += item.cgst + item.sgst + item.igst;
        productMap[key].invoiceCount += 1;
      }
    }

    const products = Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);

    return {
      summary: {
        totalProducts: products.length,
        totalRevenue,
        totalQuantity: products.reduce((s, p) => s + p.totalQuantity, 0),
      },
      products,
    };
  }

  async getInventoryValuation(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      include: {
        stockBatches: {
          include: { warehouse: true },
        },
      },
    });

    const valuation = products.map((p) => {
      const totalStock = p.stockBatches.reduce((s, b) => s + b.quantity, 0);
      const stockValue = p.stockBatches.reduce((s, b) => s + (b.quantity * (b.purchasePrice || p.purchasePrice)), 0);

      return {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        hsnCode: p.hsnCode,
        unit: p.unit,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        totalStock,
        stockValue,
        lowStockThreshold: p.lowStockThreshold,
        isLowStock: totalStock <= p.lowStockThreshold,
        isService: p.isService,
        warehouses: p.stockBatches.map((b) => ({
          warehouseId: b.warehouseId,
          warehouseName: b.warehouse.name,
          quantity: b.quantity,
          batchNo: b.batchNo,
          expiryDate: b.expiryDate,
        })),
      };
    }).sort((a, b) => b.stockValue - a.stockValue);

    return {
      summary: {
        totalProducts: valuation.length,
        totalStockValue: valuation.reduce((s, v) => s + v.stockValue, 0),
        lowStockCount: valuation.filter((v) => v.isLowStock).length,
      },
      products: valuation,
    };
  }

  async getOutstandingReport(businessId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        status: 'CONFIRMED',
        grandTotal: { gt: 0 },
      },
      include: { customer: true },
      orderBy: { invoiceDate: 'desc' },
    });

    const customerOutstanding: Record<string, {
      customerId: string;
      customerName: string;
      phone: string;
      totalInvoiced: number;
      totalPaid: number;
      outstanding: number;
      overdueCount: number;
      oldestDueDate: Date | null;
    }> = {};

    const now = new Date();

    for (const invoice of invoices) {
      const outstanding = invoice.grandTotal - invoice.paidAmount;
      if (outstanding <= 0) continue;

      const custId = invoice.customerId || 'no-customer';
      if (!customerOutstanding[custId]) {
        customerOutstanding[custId] = {
          customerId: custId,
          customerName: invoice.customer?.name || 'Unknown',
          phone: invoice.customer?.phone || '',
          totalInvoiced: 0,
          totalPaid: 0,
          outstanding: 0,
          overdueCount: 0,
          oldestDueDate: null,
        };
      }

      const entry = customerOutstanding[custId];
      entry.totalInvoiced += invoice.grandTotal;
      entry.totalPaid += invoice.paidAmount;
      entry.outstanding += outstanding;

      const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
      if (dueDate && dueDate < now) {
        entry.overdueCount += 1;
      }
      if (dueDate && (!entry.oldestDueDate || dueDate < entry.oldestDueDate)) {
        entry.oldestDueDate = dueDate;
      }
    }

    const customers = Object.values(customerOutstanding)
      .filter((c) => c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);

    return {
      summary: {
        totalOutstanding: customers.reduce((s, c) => s + c.outstanding, 0),
        totalCustomers: customers.length,
        overdueCount: customers.filter((c) => c.overdueCount > 0).length,
      },
      customers,
    };
  }

  async getPaymentCollection(businessId: string, startDate?: string, endDate?: string) {
    const where: any = { businessId, status: 'COMPLETED' };
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: { customer: true, invoice: true },
      orderBy: { paidAt: 'desc' },
    });

    const byMethod: Record<string, { count: number; total: number }> = {};
    const byCustomer: Record<string, { name: string; count: number; total: number }> = {};
    const byDay: Record<string, { count: number; total: number }> = {};

    for (const payment of payments) {
      const method = payment.method;
      if (!byMethod[method]) byMethod[method] = { count: 0, total: 0 };
      byMethod[method].count += 1;
      byMethod[method].total += payment.amount;

      const custKey = payment.customerId || 'no-customer';
      if (!byCustomer[custKey]) {
        byCustomer[custKey] = { name: payment.customer?.name || 'Unknown', count: 0, total: 0 };
      }
      byCustomer[custKey].count += 1;
      byCustomer[custKey].total += payment.amount;

      const day = payment.paidAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { count: 0, total: 0 };
      byDay[day].count += 1;
      byDay[day].total += payment.amount;
    }

    return {
      summary: {
        totalCollected: payments.reduce((s, p) => s + p.amount, 0),
        totalPayments: payments.length,
        avgPayment: payments.length > 0 ? payments.reduce((s, p) => s + p.amount, 0) / payments.length : 0,
      },
      byMethod: Object.entries(byMethod).map(([method, data]) => ({ method, ...data })),
      byCustomer: Object.values(byCustomer).sort((a, b) => b.total - a.total),
      byDay: Object.entries(byDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getStockMovementReport(businessId: string, startDate?: string, endDate?: string, productId?: string) {
    const where: any = {
      product: { businessId },
    };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (productId) where.productId = productId;

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });

    const byProduct: Record<string, { name: string; sku: string; totalIn: number; totalOut: number; net: number; movements: number }> = {};
    for (const m of movements) {
      const key = m.productId;
      if (!byProduct[key]) {
        byProduct[key] = { name: m.product.name, sku: m.product.sku || '', totalIn: 0, totalOut: 0, net: 0, movements: 0 };
      }
      byProduct[key].movements += 1;
      if (['PURCHASE', 'TRANSFER_IN', 'RETURN'].includes(m.type)) {
        byProduct[key].totalIn += m.quantity;
      } else {
        byProduct[key].totalOut += m.quantity;
      }
      byProduct[key].net = byProduct[key].totalIn - byProduct[key].totalOut;
    }

    const monthlySummary: Record<string, { month: string; purchases: number; sales: number; transfers: number; adjustments: number; returns: number }> = {};
    for (const m of movements) {
      const monthKey = m.createdAt.toISOString().slice(0, 7);
      if (!monthlySummary[monthKey]) monthlySummary[monthKey] = { month: monthKey, purchases: 0, sales: 0, transfers: 0, adjustments: 0, returns: 0 };
      if (m.type === 'PURCHASE') monthlySummary[monthKey].purchases += m.quantity;
      else if (m.type === 'SALE') monthlySummary[monthKey].sales += m.quantity;
      else if (m.type.startsWith('TRANSFER')) monthlySummary[monthKey].transfers += m.quantity;
      else if (m.type === 'ADJUSTMENT') monthlySummary[monthKey].adjustments += m.quantity;
      else if (m.type === 'RETURN') monthlySummary[monthKey].returns += m.quantity;
    }

    const byType: Record<string, { count: number; totalQuantity: number }> = {};
    for (const m of movements) {
      if (!byType[m.type]) byType[m.type] = { count: 0, totalQuantity: 0 };
      byType[m.type].count += 1;
      byType[m.type].totalQuantity += m.quantity;
    }

    return {
      summary: {
        totalMovements: movements.length,
        totalIn: movements.filter(m => ['PURCHASE', 'TRANSFER_IN', 'RETURN'].includes(m.type)).reduce((s, m) => s + m.quantity, 0),
        totalOut: movements.filter(m => ['SALE', 'TRANSFER_OUT', 'ADJUSTMENT'].includes(m.type)).reduce((s, m) => s + m.quantity, 0),
        productsAffected: Object.keys(byProduct).length,
      },
      byProduct: Object.values(byProduct),
      monthlySummary: Object.values(monthlySummary).sort((a, b) => a.month.localeCompare(b.month)),
      byType: Object.entries(byType).map(([type, data]) => ({ type, ...data })),
      movements: movements.map(m => ({
        id: m.id,
        date: m.createdAt,
        productName: m.product.name,
        warehouseName: m.warehouse.name,
        type: m.type,
        quantity: m.quantity,
        batchNo: m.batchNo,
        notes: m.notes,
      })),
    };
  }

  async getInventoryDashboard(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId, isActive: true, isService: false },
      include: { stockBatches: { include: { warehouse: true } } },
    });

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => {
      const stock = p.stockBatches.reduce((s, b) => s + b.quantity, 0);
      return sum + (stock * p.purchasePrice);
    }, 0);
    const totalRetailValue = products.reduce((sum, p) => {
      const stock = p.stockBatches.reduce((s, b) => s + b.quantity, 0);
      return sum + (stock * p.sellingPrice);
    }, 0);

    const lowStockProducts = products.filter(p => {
      const stock = p.stockBatches.reduce((s, b) => s + b.quantity, 0);
      return stock <= p.lowStockThreshold && p.lowStockThreshold > 0;
    });

    const outOfStockProducts = products.filter(p => {
      const stock = p.stockBatches.reduce((s, b) => s + b.quantity, 0);
      return stock === 0;
    });

    const warehouseMap: Record<string, { name: string; products: number; value: number }> = {};
    for (const p of products) {
      for (const b of p.stockBatches) {
        const wid = b.warehouseId;
        if (!warehouseMap[wid]) warehouseMap[wid] = { name: b.warehouse.name, products: 0, value: 0 };
        warehouseMap[wid].products += 1;
        warehouseMap[wid].value += b.quantity * p.purchasePrice;
      }
    }

    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { product: { businessId } },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      totalProducts,
      stockValue: totalStockValue,
      retailValue: totalRetailValue,
      potentialProfit: totalRetailValue - totalStockValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      stockByWarehouse: Object.values(warehouseMap).map(w => ({ warehouse: w.name, value: w.value })),
      recentMovements: recentMovements.map(m => ({
        id: m.id, date: m.createdAt, productName: m.product.name,
        warehouseName: m.warehouse.name, type: m.type, quantity: m.quantity,
        batchNo: null, notes: null, productId: m.productId,
      })),
      lowStockAlerts: lowStockProducts.map(p => ({
        productName: p.name,
        currentStock: p.stockBatches.reduce((s, b) => s + b.quantity, 0),
        threshold: p.lowStockThreshold,
        unit: p.unit,
      })),
    };
  }
}
