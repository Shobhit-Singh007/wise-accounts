import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';

const mockDashboard = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../api/reports', () => ({
  reportsApi: { dashboard: (id: string) => mockDashboard(id) },
}));

vi.mock('../context/BusinessContext', () => ({
  useBusiness: () => ({
    currentBusinessId: 'biz1',
    businesses: [{ id: 'biz1', name: 'Test Business' }],
    loading: false,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockStats = {
  totalCustomers: 45,
  totalProducts: 200,
  totalInvoices: 150,
  totalRevenue: 500000,
  totalBilled: 450000,
  outstanding: 50000,
  pendingInvoices: 10,
  overdueInvoices: 3,
  monthlySales: [],
  paymentMethodBreakdown: [],
  topCustomers: [],
  topProducts: [],
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockDashboard.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    mockDashboard.mockRejectedValue(new Error('API Error'));
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders stat cards with data', async () => {
    mockDashboard.mockResolvedValue({ data: mockStats });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });

  it('renders revenue card when stats loaded', async () => {
    mockDashboard.mockResolvedValue({ data: { ...mockStats, totalRevenue: 500000 } });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/total revenue/i)).toBeInTheDocument();
    });
  });
});
