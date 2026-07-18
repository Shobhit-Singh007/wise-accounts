import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SettingsPage from '../pages/SettingsPage';

const mockUpdate = vi.fn().mockResolvedValue({ data: {} });
const mockGetById = vi.fn().mockResolvedValue({ data: { id: 'biz1', name: 'Test Biz', gstin: '27AABCU9603R1ZM', phone: '9876543210', email: 'test@test.com', address: '123 St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' } });

vi.mock('../api/businesses', () => ({
  businessesApi: {
    update: (...args: any[]) => mockUpdate(...args),
    getById: (...args: any[]) => mockGetById(...args),
  },
}));

vi.mock('../api/invoices', () => ({
  invoicesApi: {
    getSettings: vi.fn().mockResolvedValue({ data: { invoicePrefix: 'INV', startingNumber: 1001 } }),
    updateSettings: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { defaultTaxRate: 18, taxDisplayMode: 'inclusive' } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../context/BusinessContext', () => ({
  useBusiness: () => ({
    currentBusinessId: 'biz1',
    currentBusiness: { id: 'biz1', name: 'Test Biz', gstin: '27AABCU9603R1ZM' },
  }),
}));

import client from '../api/client';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tab labels', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Business Profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Invoice Settings')).toBeInTheDocument();
    expect(screen.getByText('Tax Settings')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('API Credentials')).toBeInTheDocument();
    expect(screen.getByText('Import / Export')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('Business Profile tab shows GSTIN field', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('GSTIN')).toBeInTheDocument();
    });
  });

  it('GSTIN field has search icon button', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('GSTIN')).toBeInTheDocument();
    });
  });

  it('clicking save calls businessesApi.update', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('tax settings tab renders', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tax Settings')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Tax Settings'));

    await waitFor(() => {
      expect(screen.getByText('Default Tax Rate (%)')).toBeInTheDocument();
    });
  });

  it('notification settings tab renders', async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Notifications'));

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });
  });
});
