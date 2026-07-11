import client from './client';

export interface StaffMember {
  userId: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  role: string;
  permissions: string[];
  isDefault: boolean;
  joinedAt: string;
}

export interface StaffInvite {
  id: string;
  phone: string;
  email?: string;
  name?: string;
  role: string;
  permissions: string[];
  token: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface PermissionPreset {
  key: string;
  label: string;
  permissions: string[];
}

export const PERMISSION_GROUPS = [
  { resource: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { resource: 'customers', label: 'Customers', actions: ['view', 'create', 'edit', 'delete'] },
  { resource: 'products', label: 'Products', actions: ['view', 'create', 'edit', 'delete'] },
  { resource: 'invoices', label: 'Invoices', actions: ['view', 'create', 'edit', 'delete', 'cancel'] },
  { resource: 'payments', label: 'Payments', actions: ['view', 'create', 'delete'] },
  { resource: 'reports', label: 'Reports', actions: ['view', 'export'] },
  { resource: 'settings', label: 'Settings', actions: ['view', 'edit'] },
  { resource: 'staff', label: 'Staff', actions: ['view', 'invite', 'edit', 'remove'] },
  { resource: 'warehouses', label: 'Warehouses', actions: ['view', 'create', 'edit', 'delete'] },
];

export const ROLE_COLORS: Record<string, string> = {
  BUSINESS_ADMIN: '#1a237e',
  BUSINESS_EDITOR: '#1565c0',
  BUSINESS_VIEWER: '#757575',
};

export const ROLE_LABELS: Record<string, string> = {
  BUSINESS_ADMIN: 'Admin',
  BUSINESS_EDITOR: 'Editor',
  BUSINESS_VIEWER: 'Viewer',
};

export const staffApi = {
  listStaff: (businessId: string) =>
    client.get<StaffMember[]>(`/businesses/${businessId}/staff`),

  invite: (businessId: string, data: {
    phone: string;
    email?: string;
    name?: string;
    rolePreset?: string;
    permissions?: string[];
    role?: string;
  }) => client.post(`/businesses/${businessId}/staff/invite`, data),

  updatePermissions: (businessId: string, userId: string, data: {
    permissions: string[];
    role?: string;
  }) => client.put(`/businesses/${businessId}/staff/${userId}/permissions`, data),

  removeStaff: (businessId: string, userId: string) =>
    client.delete(`/businesses/${businessId}/staff/${userId}`),

  listInvites: (businessId: string) =>
    client.get<StaffInvite[]>(`/businesses/${businessId}/staff/invites`),

  cancelInvite: (businessId: string, inviteId: string) =>
    client.delete(`/businesses/${businessId}/staff/invites/${inviteId}`),

  getPresets: () =>
    client.get<PermissionPreset[]>('/staff/permission-presets'),
};
