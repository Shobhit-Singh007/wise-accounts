export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalInvoices: number;
  totalRevenue: number;
  totalBilled: number;
  outstanding: number;
  pendingInvoices: number;
  overdueInvoices: number;
  monthlySales: { month: string; amount: number }[];
  paymentMethodBreakdown: { method: string; total: number; count: number }[];
  topCustomers: { name: string; total: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
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
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
  };
  b2b: {
    invoiceNo: string;
    date: string;
    customerName: string;
    customerGstin: string | null;
    invoiceValue: number;
    placeOfSupply: string;
    reverseCharge: boolean;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    taxAmount: number;
    grandTotal: number;
  }[];
  b2cLarge: {
    placeOfSupply: string;
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];
  b2cSmall: {
    placeOfSupply: string;
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];
  hsnSummary: {
    hsnCode: string;
    description: string;
    uqc: string;
    quantity: number;
    totalValue: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];
  documents: {
    invoicesIssued: { count: number; totalValue: number };
    creditNotes: { count: number; totalValue: number };
  };
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
  outwardSupplies: {
    label: string;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }[];
  interStateSupplies: {
    placeOfSupply: string;
    taxableValue: number;
    igst: number;
  }[];
  eligibleItc: {
    label: string;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }[];
  exemptNilNonGst: {
    label: string;
    taxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    cess: number;
  }[];
  paymentOfTax: {
    label: string;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    interest: number;
    lateFee: number;
    total: number;
  }[];
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

export interface CustomerReportItem {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
  totalInvoices: number;
  totalPayments: number;
}

export interface ProductReportSummary {
  totalProducts: number;
  totalRevenue: number;
  totalQuantity: number;
}

export interface ProductReportItem {
  productId: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  totalTax: number;
  invoiceCount: number;
}

export interface ProductReport {
  summary: ProductReportSummary;
  products: ProductReportItem[];
}

export interface InventoryValuationSummary {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
}

export interface InventoryValuationItem {
  productId: string;
  name: string;
  sku: string | null;
  hsnCode: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  totalStock: number;
  stockValue: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isService: boolean;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    batchNo: string | null;
    expiryDate: string | null;
  }[];
}

export interface InventoryValuation {
  summary: InventoryValuationSummary;
  products: InventoryValuationItem[];
}

export interface OutstandingSummary {
  totalOutstanding: number;
  totalCustomers: number;
  overdueCount: number;
}

export interface OutstandingCustomer {
  customerId: string;
  customerName: string;
  phone: string;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdueCount: number;
  oldestDueDate: string | null;
}

export interface OutstandingReport {
  summary: OutstandingSummary;
  customers: OutstandingCustomer[];
}

export interface PaymentCollectionSummary {
  totalCollected: number;
  totalPayments: number;
  avgPayment: number;
}

export interface PaymentCollectionReport {
  summary: PaymentCollectionSummary;
  byMethod: { method: string; count: number; total: number }[];
  byCustomer: { name: string; count: number; total: number }[];
  byDay: { date: string; count: number; total: number }[];
}

export interface StockMovementItem {
  id: string;
  date: string;
  productName: string;
  productId: string;
  warehouseName: string;
  type: 'PURCHASE' | 'SALE' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  batchNo: string | null;
  notes: string | null;
}

export interface StockMovementsReport {
  movements: StockMovementItem[];
  monthlySummary: { month: string; purchases: number; sales: number; transfers: number; adjustments: number; returns: number }[];
}

export interface InventoryDashboardReport {
  totalProducts: number;
  stockValue: number;
  retailValue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockByWarehouse: { warehouse: string; value: number }[];
  recentMovements: StockMovementItem[];
  lowStockAlerts: { productName: string; currentStock: number; threshold: number; unit: string }[];
}

export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  productCount: number;
  children: InventoryCategory[];
}

export interface InventorySupplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstin: string | null;
  activeOrders: number;
}

export interface InventoryPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  supplierId: string;
  date: string;
  expectedDate: string | null;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  itemCount: number;
  items: { productName: string; quantity: number; receivedQuantity: number; unitPrice: number }[];
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

  customers: (businessId: string) =>
    client.get<CustomerReportItem[]>(`${prefix(businessId)}/reports/customers`),

  products: (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => client.get<ProductReport>(`${prefix(businessId)}/reports/products`, { params }),

  inventoryValuation: (businessId: string) =>
    client.get<InventoryValuation>(`${prefix(businessId)}/reports/inventory-valuation`),

  outstanding: (businessId: string) =>
    client.get<OutstandingReport>(`${prefix(businessId)}/reports/outstanding`),

  paymentCollection: (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
  }) => client.get<PaymentCollectionReport>(`${prefix(businessId)}/reports/payment-collection`, { params }),

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

  stockMovements: (businessId: string, params?: {
    startDate?: string;
    endDate?: string;
    productId?: string;
  }) => client.get<StockMovementsReport>(`${prefix(businessId)}/reports/stock-movements`, { params }),

  inventoryDashboard: (businessId: string) =>
    client.get<InventoryDashboardReport>(`${prefix(businessId)}/reports/inventory-dashboard`),
};
