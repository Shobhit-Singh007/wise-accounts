import { hasPermission, ALL_PERMISSIONS, ROLE_PRESETS, ROLE_LABELS } from './permissions';

describe('Permissions', () => {
  describe('hasPermission', () => {
    it('should return true for wildcard permission', () => {
      expect(hasPermission(['*'], 'anything.goes')).toBe(true);
    });

    it('should return true when permission exists', () => {
      expect(hasPermission(['dashboard.view', 'invoices.create'], 'invoices.create')).toBe(true);
    });

    it('should return false when permission does not exist', () => {
      expect(hasPermission(['dashboard.view'], 'invoices.create')).toBe(false);
    });

    it('should return false for empty permissions', () => {
      expect(hasPermission([], 'dashboard.view')).toBe(false);
    });
  });

  describe('ALL_PERMISSIONS', () => {
    it('should contain all resource.action pairs', () => {
      expect(ALL_PERMISSIONS).toContain('dashboard.view');
      expect(ALL_PERMISSIONS).toContain('customers.create');
      expect(ALL_PERMISSIONS).toContain('products.edit');
      expect(ALL_PERMISSIONS).toContain('invoices.delete');
      expect(ALL_PERMISSIONS).toContain('payments.create');
      expect(ALL_PERMISSIONS).toContain('reports.export');
      expect(ALL_PERMISSIONS).toContain('settings.edit');
      expect(ALL_PERMISSIONS).toContain('staff.invite');
      expect(ALL_PERMISSIONS).toContain('warehouses.delete');
    });

    it('should have no duplicates', () => {
      expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    });
  });

  describe('ROLE_PRESETS', () => {
    it('owner should have all permissions', () => {
      expect(ROLE_PRESETS.owner).toEqual(ALL_PERMISSIONS);
    });

    it('admin should not have staff.remove or settings.edit', () => {
      expect(ROLE_PRESETS.admin).not.toContain('staff.remove');
      expect(ROLE_PRESETS.admin).not.toContain('settings.edit');
      expect(ROLE_PRESETS.admin).toContain('invoices.create');
    });

    it('viewer should only have view permissions', () => {
      for (const perm of ROLE_PRESETS.viewer) {
        expect(perm).toMatch(/\.view$/);
      }
    });

    it('sales should have limited permissions', () => {
      expect(ROLE_PRESETS.sales).toContain('dashboard.view');
      expect(ROLE_PRESETS.sales).toContain('customers.view');
      expect(ROLE_PRESETS.sales).toContain('invoices.create');
      expect(ROLE_PRESETS.sales).not.toContain('payments.delete');
    });

    it('accountant should have payment and report permissions', () => {
      expect(ROLE_PRESETS.accountant).toContain('payments.view');
      expect(ROLE_PRESETS.accountant).toContain('payments.create');
      expect(ROLE_PRESETS.accountant).toContain('reports.view');
      expect(ROLE_PRESETS.accountant).toContain('reports.export');
    });
  });

  describe('ROLE_LABELS', () => {
    it('should have labels for all roles', () => {
      expect(ROLE_LABELS.owner).toBe('Owner');
      expect(ROLE_LABELS.admin).toBe('Admin');
      expect(ROLE_LABELS.manager).toBe('Manager');
      expect(ROLE_LABELS.accountant).toBe('Accountant');
      expect(ROLE_LABELS.sales).toBe('Sales');
      expect(ROLE_LABELS.viewer).toBe('Viewer');
    });
  });
});
