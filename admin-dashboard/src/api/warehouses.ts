import client from './client';

export interface Warehouse {
  id: string;
  businessId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
}

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const warehousesApi = {
  list: (businessId: string) =>
    client.get<Warehouse[]>(`${prefix(businessId)}/warehouses`),

  create: (businessId: string, data: { name: string; address?: string; city?: string; state?: string }) =>
    client.post<Warehouse>(`${prefix(businessId)}/warehouses`, data),

  update: (businessId: string, id: string, data: { name?: string; address?: string; city?: string; state?: string }) =>
    client.put<Warehouse>(`${prefix(businessId)}/warehouses/${id}`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/warehouses/${id}`),
};
