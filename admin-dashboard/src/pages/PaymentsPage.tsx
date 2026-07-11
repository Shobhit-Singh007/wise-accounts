import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Alert, Chip } from '@mui/material';
import DataTable from '../components/DataTable';
import { paymentsApi, type Payment } from '../api/payments';
import { useBusiness } from '../context/BusinessContext';

const methodLabels: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
};

const methodColors: Record<string, 'success' | 'info' | 'warning' | 'primary' | 'default'> = {
  CASH: 'success',
  BANK_TRANSFER: 'info',
  UPI: 'primary',
  CARD: 'warning',
  CHEQUE: 'default',
};

export default function PaymentsPage() {
  const { currentBusinessId } = useBusiness();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const fetchPayments = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await paymentsApi.list(currentBusinessId, {
        search,
        page: page + 1,
        limit: rowsPerPage,
      });
      setPayments(data.data || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load payments',
      );
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId, search, page, rowsPerPage]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const columns = [
    {
      id: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (r: Payment) => r.customer?.name || '-',
    },
    {
      id: 'invoiceNo',
      label: 'Invoice #',
      render: (r: Payment) => r.invoice?.invoiceNo || 'Advance',
    },
    { id: 'amount', label: 'Amount', sortable: true, render: (r: Payment) => `₹${(r.amount || 0).toLocaleString('en-IN')}` },
    {
      id: 'method',
      label: 'Method',
      render: (r: Payment) => (
        <Chip label={methodLabels[r.method] || r.method} size="small" color={methodColors[r.method] || 'default'} variant="outlined" />
      ),
    },
    { id: 'reference', label: 'Reference', render: (r: Payment) => r.reference || '-' },
    { id: 'paidAt', label: 'Date', sortable: true, render: (r: Payment) => new Date(r.paidAt).toLocaleDateString('en-IN') },
    {
      id: 'status',
      label: 'Status',
      render: (r: Payment) => (
        <Chip
          label={r.status.toLowerCase()}
          size="small"
          color={r.status === 'COMPLETED' ? 'success' : r.status === 'PENDING' ? 'warning' : 'error'}
        />
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Payments</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={payments}
        loading={loading}
        searchable
        searchPlaceholder="Search payments..."
        onSearch={(q) => { setSearch(q); setPage(0); }}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
        emptyMessage="No payments recorded yet."
      />
    </Box>
  );
}
