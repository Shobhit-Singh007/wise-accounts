export interface Invoice {
  id: string;
  businessId: string;
  customerId: string | null;
  supplierId: string | null;
  invoiceNo: string;
  type: 'B2B' | 'B2C';
  direction: 'SALE' | 'PURCHASE';
  invoiceDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  discount: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  status: string;
  notes?: string | null;
  terms?: string | null;
  ewayBillNo?: string | null;
  ewayBillDate?: string | null;
  transporterId?: string | null;
  transporterName?: string | null;
  vehicleNo?: string | null;
  distanceKm?: number | null;
  supplyType?: string | null;
  docType?: string | null;
  valueOfGoods?: number | null;
  irn?: string | null;
  irnDate?: string | null;
  ackNo?: string | null;
  ackDate?: string | null;
  qrCode?: string | null;
  placeOfSupply?: string | null;
  reverseCharge?: boolean;
  poNo?: string | null;
  poDate?: string | null;
  challanNo?: string | null;
  challanDate?: string | null;
  lrNo?: string | null;
  paymentType?: string | null;
  paymentNote?: string | null;
  cessTotal?: number;
  totalInWords?: string | null;
  totalQuantity?: number;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerState?: string | null;
  customer?: { id: string; name: string; phone: string; gstin?: string | null; state?: string; address?: string; city?: string; pincode?: string };
  supplier?: { id: string; name: string; phone: string; gstin?: string | null; state?: string; address?: string; city?: string; pincode?: string };
  createdBy?: { id: string; name: string };
  items: InvoiceItem[];
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  productId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  taxableValue: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  batchNo?: string | null;
  productNote?: string | null;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  cessRate?: number;
  cessAmount?: number;
  serialNo?: number | null;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference?: string | null;
  paidAt: string;
}

export interface InvoiceSettings {
  invoicePrefix: string;
  startingNumber: number;
  defaultNotes: string;
  defaultTerms: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankBranch: string;
  upiId: string;
  showGstin: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
  signatureUrl: string;
  ewayBillApi: Record<string, string>;
  einvoiceApi: Record<string, string>;
}

export interface CreateInvoiceRequest {
  type: 'B2B' | 'B2C';
  direction: 'SALE' | 'PURCHASE';
  customerId?: string;
  supplierId?: string;
  invoiceDate?: string;
  dueDate?: string;
  discount?: number;
  notes?: string;
  terms?: string;
  placeOfSupply?: string;
  poNo?: string;
  challanNo?: string;
  lrNo?: string;
  paymentType?: string;
  cessTotal?: number;
  totalInWords?: string;
  totalQuantity?: number;
  transporterId?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerState?: string;
  items: Array<{
    productId?: string;
    itemName: string;
    quantity: number;
    unit?: string;
    rate: number;
    discount?: number;
    taxRate?: number;
    batchNo?: string;
    productNote?: string;
    cgstRate?: number;
    sgstRate?: number;
    igstRate?: number;
    cessRate?: number;
    serialNo?: number;
  }>;
  referenceId?: string;
}

export interface GenerateEwayBillRequest {
  transporterId?: string;
  transporterName?: string;
  vehicleNo: string;
  distanceKm: number;
  supplyType?: string;
  docType?: string;
  transportMode?: string;
}

export interface GenerateEinvoiceRequest {
  generateViaApi?: boolean;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
}

import client from './client';

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const invoicesApi = {
  list: (businessId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    direction?: string;
    customerId?: string;
  }) =>
    client.get<{ data: Invoice[]; meta: { total: number; page: number; limit: number } }>(
      `${prefix(businessId)}/invoices`,
      { params },
    ),

  getById: (businessId: string, id: string) =>
    client.get<Invoice>(`${prefix(businessId)}/invoices/${id}`),

  create: (businessId: string, data: CreateInvoiceRequest) =>
    client.post<Invoice>(`${prefix(businessId)}/invoices`, data),

  update: (businessId: string, id: string, data: Partial<CreateInvoiceRequest>) =>
    client.put<Invoice>(`${prefix(businessId)}/invoices/${id}`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/invoices/${id}`),

  cancel: (businessId: string, id: string) =>
    client.post(`${prefix(businessId)}/invoices/${id}/cancel`),

  getSettings: (businessId: string) =>
    client.get<InvoiceSettings>(`${prefix(businessId)}/invoices/settings`),

  updateSettings: (businessId: string, data: Partial<InvoiceSettings>) =>
    client.put(`${prefix(businessId)}/invoices/settings`, data),

  generateEwayBill: (businessId: string, invoiceId: string, data: GenerateEwayBillRequest) =>
    client.post(`${prefix(businessId)}/invoices/${invoiceId}/eway-bill`, data),

  generateEinvoice: (businessId: string, invoiceId: string, data: GenerateEinvoiceRequest) =>
    client.post(`${prefix(businessId)}/invoices/${invoiceId}/e-invoice`, data),

  getPdfUrl: (businessId: string, id: string) =>
    `/api/v1${prefix(businessId)}/invoices/${id}/pdf`,

  getPrintUrl: (businessId: string, id: string, documentType?: string) =>
    `/api/v1${prefix(businessId)}/invoices/${id}/print${documentType ? `?documentType=${documentType}` : ''}`,

  downloadPdf: (businessId: string, id: string, documentType?: string) => {
    const token = localStorage.getItem('accessToken');
    const qs = documentType ? `?documentType=${documentType}` : '';
    return fetch(`/api/v1${prefix(businessId)}/invoices/${id}/pdf${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => {
      if (!r.ok) throw new Error(`PDF download failed: ${r.status}`);
      return r.blob();
    });
  },

  openPrint: (businessId: string, id: string, documentType?: string) => {
    const token = localStorage.getItem('accessToken');
    const qs = documentType ? `?documentType=${documentType}` : '';
    fetch(`/api/v1${prefix(businessId)}/invoices/${id}/print${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Print failed: ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => {});
  },

  generateBoth: (businessId: string, invoiceId: string, data: GenerateEwayBillRequest & { generateViaApi?: boolean; irn?: string; ackNo?: string; ackDate?: string }) =>
    client.post(`${prefix(businessId)}/invoices/${invoiceId}/generate-both`, data),

  getTemplates: (businessId: string) =>
    client.get<InvoiceTemplate[]>(`${prefix(businessId)}/invoices/templates`),

  saveTemplate: (businessId: string, templateId: string) =>
    client.put(`${prefix(businessId)}/invoices/templates/${templateId}/activate`),

  getTemplatePdfUrl: (businessId: string, invoiceId: string, templateId: string) =>
    `/api/v1${prefix(businessId)}/invoices/${invoiceId}/pdf?template=${templateId}`,

  getTemplatePrintUrl: (businessId: string, invoiceId: string, templateId: string) =>
    `/api/v1${prefix(businessId)}/invoices/${invoiceId}/print?template=${templateId}`,
};

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'classic' | 'modern' | 'minimal' | 'professional' | 'bold' | 'gradient' | 'elegant' | 'compact' | 'detailed' | 'colorful' | 'monochrome' | 'corporate' | 'simple' | 'fancy' | 'traditional';
  accentColor: string;
  headerStyle: 'filled' | 'bordered' | 'gradient' | 'underline' | 'minimal';
  tableStyle: 'striped' | 'bordered' | 'minimal' | 'modern' | 'alternate';
  font: 'arial' | 'georgia' | 'roboto' | 'fira';
  isActive: boolean;
  previewUrl?: string;
}
