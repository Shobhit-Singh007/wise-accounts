import client from './client';

export interface CustomerGroup {
  id: string;
  businessId: string;
  name: string;
  discount: number;
  createdAt: string;
  _count?: { customers: number };
}

function prefix(businessId: string) {
  return `/businesses/${businessId}/customer-groups`;
}

export const groupsApi = {
  list: (businessId: string) =>
    client.get<CustomerGroup[]>(`${prefix(businessId)}`),

  create: (businessId: string, data: { name: string; discount?: number }) =>
    client.post<CustomerGroup>(`${prefix(businessId)}`, data),

  update: (businessId: string, id: string, data: { name?: string; discount?: number }) =>
    client.put<CustomerGroup>(`${prefix(businessId)}/${id}`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/${id}`),
};
