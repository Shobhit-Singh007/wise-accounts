export interface Product {
  id: string;
  name: string;
  sku: string;
  hsnCode: string;
  unit: string;
  sellingPrice: number;
  purchasePrice: number;
  taxRate: number;
  taxType: string;
  lowStockThreshold: number;
  categoryId: string | null;
  isActive: boolean;
  stock: number;
  createdAt: string;
}

export interface ProductCreate {
  name: string;
  sku?: string;
  hsnCode: string;
  unit: string;
  sellingPrice: number;
  purchasePrice?: number;
  taxRate: number;
  lowStockThreshold?: number;
  categoryId?: string;
}

import client from './client';

function prefix(businessId: string) {
  return `/businesses/${businessId}`;
}

export const productsApi = {
  list: (businessId: string, params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    client.get<{ data: Product[]; meta: { total: number; page: number; limit: number } }>(
      `${prefix(businessId)}/products`,
      { params },
    ),

  getById: (businessId: string, id: string) =>
    client.get<Product>(`${prefix(businessId)}/products/${id}`),

  create: (businessId: string, data: ProductCreate) =>
    client.post<Product>(`${prefix(businessId)}/products`, data),

  update: (businessId: string, id: string, data: Partial<ProductCreate>) =>
    client.put<Product>(`${prefix(businessId)}/products/${id}`, data),

  delete: (businessId: string, id: string) =>
    client.delete(`${prefix(businessId)}/products/${id}`),
};
