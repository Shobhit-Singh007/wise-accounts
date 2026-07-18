import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ExportMenu from '../components/ExportMenu';
import * as exportUtils from '../utils/exportUtils';

vi.mock('../utils/exportUtils', () => ({
  exportData: vi.fn(),
}));

const defaultProps = {
  headers: ['Name', 'Age'],
  rows: [['Alice', 30]] as (string | number)[][],
  filename: 'users',
  title: 'User List',
};

describe('ExportMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Export button', () => {
    render(<ExportMenu {...defaultProps} />);
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('opens menu on button click and shows all format options', () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));

    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Excel (XLSX)')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
  });

  it('calls exportData with csv format when CSV is clicked', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(exportUtils.exportData).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: ['Name', 'Age'],
          rows: [['Alice', 30]],
          filename: 'users',
          title: 'User List',
        }),
        'csv',
      );
    });
  });

  it('calls exportData with json format', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('JSON'));

    await waitFor(() => {
      expect(exportUtils.exportData).toHaveBeenCalledWith(expect.anything(), 'json');
    });
  });

  it('calls exportData with xlsx format', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('Excel (XLSX)'));

    await waitFor(() => {
      expect(exportUtils.exportData).toHaveBeenCalledWith(expect.anything(), 'xlsx');
    });
  });

  it('calls exportData with pdf format', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(exportUtils.exportData).toHaveBeenCalledWith(expect.anything(), 'pdf');
    });
  });

  it('calls fetchAllData when provided', async () => {
    const fetchAllData = vi.fn().mockResolvedValue({
      rows: [['Bob', 25]],
      jsonData: [{ Name: 'Bob', Age: 25 }],
    });
    render(<ExportMenu {...defaultProps} fetchAllData={fetchAllData} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(fetchAllData).toHaveBeenCalled();
    });
  });

  it('shows success snackbar after export', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(screen.getByText('Exported as CSV successfully')).toBeInTheDocument();
    });
  });

  it('shows success snackbar with correct format name', async () => {
    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('PDF'));

    await waitFor(() => {
      expect(screen.getByText('Exported as PDF successfully')).toBeInTheDocument();
    });
  });

  it('shows error snackbar when export fails', async () => {
    (exportUtils.exportData as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('fail');
    });

    render(<ExportMenu {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(screen.getByText('Export failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('calls fetchAllData for JSON export', async () => {
    const fetchAllData = vi.fn().mockResolvedValue({
      rows: [['Bob', 25]],
      jsonData: [{ name: 'Bob' }],
    });
    render(<ExportMenu {...defaultProps} fetchAllData={fetchAllData} />);
    fireEvent.click(screen.getByText('Export'));
    fireEvent.click(screen.getByText('JSON'));

    await waitFor(() => {
      expect(fetchAllData).toHaveBeenCalled();
    });
  });
});
