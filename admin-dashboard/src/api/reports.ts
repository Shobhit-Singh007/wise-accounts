export interface DashboardStats {
  totalBusinesses: number;
  totalCustomers: number;
  totalInvoices: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  monthlySales: { month: string; amount: number }[];
}

export interface SalesReport {
  period: { startDate?: string; endDate?: string };
  summary: {
    totalSales: number;
    totalTax: number;
    totalInvoices: number;
    averageInvoice: number;
  };
  categorySales: { name: string; count: number; total: number }[];
  invoices: unknown[];
}

export interface Gstr1Report {
  fromDate: string;
  toDate: string;
  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalTax: number;
  };
  b2b: {
    invoiceNo: string;
    date: string;
    customerName: string;
    customerGstin: string | null;
    taxableValue: number;
    taxAmount: number;
    grandTotal: number;
  }[];
  b2c: {
    count: number;
    totalTaxableValue: number;
    totalTax: number;
  };
}

export interface Gstr3bReport {
  month: number;
  year: number;
  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalTax: number;
    totalPaid: number;
    outstanding: number;
  };
}

export interface HsnReport {
  hsnCode: string;
  description: string;
  uom: string;
  totalQuantity: number;
  totalValue: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
}

import client from './client';

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const reportsApi = {
  dashboard: (businessId: string) =>
    client.get<DashboardStats>(`${prefix(businessId)}/dashboard`),

  sales: (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => client.get<SalesReport>(`${prefix(businessId)}/reports/sales`, { params }),

  gstr1: (businessId: string, params?: {
    fromDate?: string;
    toDate?: string;
  }) => client.get<Gstr1Report>(`${prefix(businessId)}/reports/gstr-1`, { params }),

  gstr3b: (businessId: string, params?: {
    month?: number;
    year?: number;
  }) => client.get<Gstr3bReport>(`${prefix(businessId)}/reports/gstr-3b`, { params }),

  hsn: (businessId: string, params?: {
    fromDate?: string;
    toDate?: string;
  }) => client.get<{ items: HsnReport[] }>(`${prefix(businessId)}/reports/hsn`, { params }),

  pnl: (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => client.get<{
    revenue: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    netProfit: number;
    invoiceCount: number;
  }>(`${prefix(businessId)}/reports/profit-loss`, { params }),
};
