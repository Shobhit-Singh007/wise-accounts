export const PERMISSIONS = {
  dashboard: ['view'] as const,
  customers: ['view', 'create', 'edit', 'delete'] as const,
  products: ['view', 'create', 'edit', 'delete'] as const,
  invoices: ['view', 'create', 'edit', 'delete', 'cancel'] as const,
  payments: ['view', 'create', 'delete'] as const,
  reports: ['view', 'export'] as const,
  settings: ['view', 'edit'] as const,
  staff: ['view', 'invite', 'edit', 'remove'] as const,
  warehouses: ['view', 'create', 'edit', 'delete'] as const,
} as const;

export type Resource = keyof typeof PERMISSIONS;
export type Action = string;
export type Permission = `${Resource}.${Action}`;

export const ALL_PERMISSIONS: string[] = Object.entries(PERMISSIONS).flatMap(
  ([resource, actions]) => actions.map((action) => `${resource}.${action}`),
);

export const ROLE_PRESETS: Record<string, string[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: ALL_PERMISSIONS.filter((p) => p !== 'staff.remove' && p !== 'settings.edit'),
  manager: [
    'dashboard.view',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete', 'invoices.cancel',
    'payments.view', 'payments.create',
    'reports.view',
    'warehouses.view', 'warehouses.create', 'warehouses.edit', 'warehouses.delete',
  ],
  accountant: [
    'dashboard.view',
    'customers.view',
    'invoices.view', 'invoices.create',
    'payments.view', 'payments.create', 'payments.delete',
    'reports.view', 'reports.export',
  ],
  sales: [
    'dashboard.view',
    'customers.view', 'customers.create',
    'invoices.view', 'invoices.create',
  ],
  viewer: ALL_PERMISSIONS.filter((p) => p.endsWith('.view')),
};

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  accountant: 'Accountant',
  sales: 'Sales',
  viewer: 'Viewer',
};

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}
