import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import InvoicesPage from '../pages/InvoicesPage';

const mockCreate = vi.fn().mockResolvedValue({ data: { id: 'inv1' } });
const mockList = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
const mockGetById = vi.fn().mockResolvedValue({ data: {} });
const mockCustomersList = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
const mockCustomersCreate = vi.fn().mockResolvedValue({ data: { id: 'c1', name: 'New', gstin: null } });
const mockProductsList = vi.fn().mockResolvedValue({ data: { data: [], meta: { total: 0 } } });

vi.mock('../api/invoices', () => ({
  invoicesApi: {
    list: (...args: any[]) => mockList(...args),
    getById: (...args: any[]) => mockGetById(...args),
    create: (...args: any[]) => mockCreate(...args),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
    cancel: vi.fn().mockResolvedValue({}),
    getSettings: vi.fn().mockResolvedValue({ data: { invoicePrefix: 'INV', startingNumber: 1001, activeTemplate: 'classic' } }),
    updateSettings: vi.fn().mockResolvedValue({}),
    generateEwayBill: vi.fn().mockResolvedValue({}),
    generateEinvoice: vi.fn().mockResolvedValue({}),
    generateBoth: vi.fn().mockResolvedValue({}),
    getTemplates: vi.fn().mockResolvedValue({ data: [] }),
    openPrint: vi.fn(),
    downloadPdf: vi.fn().mockResolvedValue(new Blob()),
  },
}));

vi.mock('../api/customers', () => ({
  customersApi: {
    list: (...args: any[]) => mockCustomersList(...args),
    create: (...args: any[]) => mockCustomersCreate(...args),
  },
}));

vi.mock('../api/products', () => ({
  productsApi: {
    list: (...args: any[]) => mockProductsList(...args),
  },
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../context/BusinessContext', () => ({
  useBusiness: () => ({
    currentBusinessId: 'biz1',
    currentBusiness: { id: 'biz1', name: 'Test Biz' },
  }),
}));

vi.mock('../components/DataTable', () => ({
  default: ({ columns, rows, emptyMessage }: any) => (
    <div data-testid="data-table">
      {rows.length === 0 && <div>{emptyMessage}</div>}
    </div>
  ),
}));

vi.mock('../components/ExportMenu', () => ({
  default: () => <div data-testid="export-menu" />,
}));

vi.mock('../utils/exportUtils', () => ({
  fetchAllPages: vi.fn().mockResolvedValue([]),
}));

vi.mock('../utils/barcodeUtils', () => ({
  generateQrCodeSvg: vi.fn().mockReturnValue('<svg></svg>'),
}));

describe('CreateInvoiceDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders customer search field', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('Search customer...')).toBeInTheDocument();
  });

  it('shows "+ New" button for SALE direction', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    expect(screen.getByTitle('Add new customer')).toBeInTheDocument();
  });

  it('clicking "+ New" opens add customer dialog', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Add new customer'));

    await waitFor(() => {
      expect(screen.getByText('Quick Add Customer')).toBeInTheDocument();
    });
  });

  it('add customer dialog has GSTIN field with search button', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Add new customer'));

    await waitFor(() => {
      expect(screen.getByText('Quick Add Customer')).toBeInTheDocument();
    });

    const gstinField = screen.getAllByLabelText('GSTIN');
    expect(gstinField.length).toBeGreaterThan(0);
  });

  it('line items table renders', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    expect(screen.getByText('Line Items')).toBeInTheDocument();
  });

  it('Add Item button adds a new row', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    const addItemBtn = screen.getByText('Add Item');
    expect(addItemBtn).toBeInTheDocument();

    fireEvent.click(addItemBtn);

    await waitFor(() => {
      const textInputs = screen.getAllByPlaceholderText('Type to search product...');
      expect(textInputs.length).toBe(2);
    });
  });

  it('save button calls invoicesApi.create', async () => {
    render(<InvoicesPage />);

    fireEvent.click(screen.getByText('Create Invoice'));

    await waitFor(() => {
      expect(screen.getByText('New Sale Invoice')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Save Invoice');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
