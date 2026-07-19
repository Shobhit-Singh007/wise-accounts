export interface Business {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessCreate {
  name: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

import client from './client';

export const businessesApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    client.get<Business[]>(
      '/businesses',
      { params },
    ),

  getById: (id: string) => client.get<Business>(`/businesses/${id}`),

  create: (data: BusinessCreate) => client.post<Business>('/businesses', data),

  update: (id: string, data: Partial<BusinessCreate>) =>
    client.put<Business>(`/businesses/${id}`, data),

  delete: (id: string) => client.delete(`/businesses/${id}`),
};
