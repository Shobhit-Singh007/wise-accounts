export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  gstin?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  creditLimit: number;
  balance: number;
  openingBalance: number;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  group?: { id: string; name: string } | null;
}

export interface CustomerCreate {
  name: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  creditLimit?: number;
  openingBalance?: number;
  groupId?: string;
  notes?: string;
}

import client from './client';

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const customersApi = {
  list: (businessId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    client.get<{ data: Customer[]; meta: { total: number; page: number; limit: number } }>(
      `${prefix(businessId)}/customers`,
      { params },
    ),

  getById: (businessId: string, id: string) =>
    client.get<Customer>(`${prefix(businessId)}/customers/${id}`),

  create: (businessId: string, data: CustomerCreate) =>
    client.post<Customer>(`${prefix(businessId)}/customers`, data),

  update: (businessId: string, id: string, data: Partial<CustomerCreate>) =>
    client.put<Customer>(`${prefix(businessId)}/customers/${id}`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/customers/${id}`),

  getLedger: (businessId: string, id: string, params?: { page?: number; limit?: number }) =>
    client.get<{
      customer: {
        id: string;
        name: string;
        phone: string;
        email: string;
        gstin: string | null;
        address: string;
        city: string;
        state: string;
        creditLimit: number;
        currentBalance: number;
      };
      summary: {
        openingBalance: number;
        totalDebit: number;
        totalCredit: number;
        closingBalance: number;
        totalEntries: number;
      };
      entries: {
        id: string;
        date: string;
        type: string;
        description: string;
        invoiceNo?: string;
        debit: number;
        credit: number;
        balanceAfter: number;
        imageUrl?: string;
      }[];
    }>(
      `${prefix(businessId)}/customers/${id}/ledger`,
      { params },
    ),

  createLedgerEntry: (businessId: string, id: string, data: {
    amount: number;
    type: 'GAVE' | 'RECEIVED';
    paymentMode?: string;
    description?: string;
    date?: string;
    reference?: string;
    imageUrl?: string;
  }) =>
    client.post<{ transaction: unknown; newBalance: number }>(
      `${prefix(businessId)}/customers/${id}/ledger`,
      data,
    ),

  uploadLedgerImage: (businessId: string, customerId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<{ url: string; filename: string; size: number; mimetype: string }>(
      `${prefix(businessId)}/customers/${customerId}/ledger/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  deleteLedgerEntry: (businessId: string, customerId: string, transactionId: string) =>
    client.delete(
      `${prefix(businessId)}/customers/${customerId}/ledger/${transactionId}`,
    ),

  getLedgerPrintUrl: (businessId: string, id: string) =>
    `/api/v1${prefix(businessId)}/customers/${id}/ledger/print`,

  getLedgerPdfUrl: (businessId: string, id: string) =>
    `/api/v1${prefix(businessId)}/customers/${id}/ledger/pdf`,

  sendLedgerSms: (businessId: string, id: string, data: { phone?: string; message?: string }) =>
    client.post<{ success: boolean; phone: string; message: string; ledgerUrl: string }>(
      `${prefix(businessId)}/customers/${id}/ledger/sms`,
      data,
    ),
};
