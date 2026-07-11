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
  }) =>
    client.get<{ data: Payment[]; meta: { total: number; page: number; limit: number } }>(
      `${prefix(businessId)}/payments`,
      { params },
    ),

  getById: (businessId: string, id: string) =>
    client.get<Payment>(`${prefix(businessId)}/payments/${id}`),

  create: (businessId: string, data: Partial<Payment>) =>
    client.post<Payment>(`${prefix(businessId)}/payments`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/payments/${id}`),
};
