export interface Payment {
  id: string;
  businessId: string;
  customerId: string;
  invoiceId: string | null;
  amount: number;
  method: string;
  status: string;
  reference?: string | null;
  notes?: string | null;
  paidAt: string;
  customer?: { id: string; name: string; phone: string };
  invoice?: { id: string; invoiceNo: string } | null;
  createdAt: string;
}

export interface CreatePaymentRequest {
  customerId: string;
  invoiceId?: string;
  amount: number;
  method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE';
  reference?: string;
  notes?: string;
  paidAt?: string;
}

import client from './client';

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const paymentsApi = {
  list: (businessId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    method?: string;
    status?: string;
    reconcile?: boolean;
  }) =>
    client.get<{ data: Payment[]; meta: { total: number; page: number; limit: number } }>(
      `${prefix(businessId)}/payments`,
      { params },
    ),

  getById: (businessId: string, id: string) =>
    client.get<Payment>(`${prefix(businessId)}/payments/${id}`),

  create: (businessId: string, data: CreatePaymentRequest | Partial<Payment>) =>
    client.post<Payment>(`${prefix(businessId)}/payments`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/payments/${id}`),

  void: (businessId: string, id: string) =>
    client.post(`${prefix(businessId)}/payments/${id}/void`),

  refund: (businessId: string, id: string, data?: { amount?: number; reason?: string }) =>
    client.post(`${prefix(businessId)}/payments/${id}/refund`, data),

  reconcile: (businessId: string) =>
    client.post<{ reconciled: number }>(`${prefix(businessId)}/payments/reconcile`),

  createRazorpayOrder: (businessId: string, data: { amount: number; customerId: string; invoiceId?: string }) =>
    client.post<{ orderId: string; amount: number; currency: string; key: string }>(
      `${prefix(businessId)}/payments/razorpay-order`,
      data,
    ),
};
