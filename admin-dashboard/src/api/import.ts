import client from './client';

export const importApi = {
  parseCsv: (businessId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(`/businesses/${businessId}/import/parse-csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importCustomers: (businessId: string, customers: any[]) =>
    client.post(`/businesses/${businessId}/import/customers`, { customers }),
  importProducts: (businessId: string, products: any[]) =>
    client.post(`/businesses/${businessId}/import/products`, { products }),
  importInvoices: (businessId: string, invoices: any[]) =>
    client.post(`/businesses/${businessId}/import/invoices`, { invoices }),
};
