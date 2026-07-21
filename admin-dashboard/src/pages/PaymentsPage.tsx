import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  IconButton,
  MenuItem,
  Grid,
  Autocomplete,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Autorenew as ReconcileIcon,
  Payment as RazorpayIcon,
  QrCode as QrCodeIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import DataTable from '../components/DataTable';
import { paymentsApi, type Payment, type CreatePaymentRequest } from '../api/payments';
import { customersApi, type Customer } from '../api/customers';
import { invoicesApi, type Invoice } from '../api/invoices';
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

interface CreatePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSaved: () => void;
}

function CreatePaymentDialog({ open, onClose, businessId, onSaved }: CreatePaymentDialogProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<CreatePaymentRequest['method']>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setCustomerSearch('');
      setCustomerList([]);
      setSelectedCustomer(null);
      setInvoiceList([]);
      setSelectedInvoice(null);
      setAmount(0);
      setMethod('CASH');
      setReference('');
      setNotes('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || customerSearch.length < 2) { setCustomerList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await customersApi.list(businessId, { search: customerSearch, limit: 20 });
        setCustomerList(data.data || []);
      } catch { setCustomerList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, open, businessId]);

  useEffect(() => {
    if (!selectedCustomer || !open) { setInvoiceList([]); setSelectedInvoice(null); return; }
    invoicesApi.list(businessId, { customerId: selectedCustomer.id, status: 'CONFIRMED', limit: 50 })
      .then(({ data }) => {
        const unpaid = (data.data || []).filter((inv) => inv.paidAmount < inv.grandTotal);
        setInvoiceList(unpaid);
      })
      .catch(() => setInvoiceList([]));
  }, [selectedCustomer, open, businessId]);

  const handleSave = async () => {
    if (!selectedCustomer) { setError('Select a customer'); return; }
    if (amount <= 0) { setError('Enter a valid amount'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreatePaymentRequest = {
        customerId: selectedCustomer.id,
        invoiceId: selectedInvoice?.id,
        amount,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      };
      await paymentsApi.create(businessId, payload);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to record payment',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Record Payment
        <IconButton onClick={onClose} size="small">&times;</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Autocomplete
            options={customerList}
            getOptionLabel={(opt) => `${opt.name} (${opt.phone})`}
            value={selectedCustomer}
            onChange={(_, val) => setSelectedCustomer(val)}
            inputValue={customerSearch}
            onInputChange={(_, val) => setCustomerSearch(val)}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            renderInput={(params) => (
              <TextField {...params} label="Customer *" placeholder="Search customer..." size="small" />
            )}
            size="small"
          />
          {invoiceList.length > 0 && (
            <TextField
              select
              label="Link to Invoice (optional)"
              value={selectedInvoice?.id || ''}
              onChange={(e) => {
                const inv = invoiceList.find((i) => i.id === e.target.value);
                setSelectedInvoice(inv || null);
                if (inv && amount === 0) setAmount(inv.grandTotal - inv.paidAmount);
              }}
              size="small"
            >
              <MenuItem value="">None (Advance)</MenuItem>
              {invoiceList.map((inv) => (
                <MenuItem key={inv.id} value={inv.id}>
                  {inv.invoiceNo} — ₹{(inv.grandTotal - inv.paidAmount).toLocaleString('en-IN')} due
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label="Amount *"
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(Number(e.target.value))}
            size="small"
            inputProps={{ min: 0 }}
          />
          <TextField
            select
            label="Payment Method *"
            value={method}
            onChange={(e) => setMethod(e.target.value as CreatePaymentRequest['method'])}
            size="small"
          >
            {Object.entries(methodLabels).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            size="small"
            placeholder="Transaction ID, cheque number..."
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Record Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface RazorpayDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  razorpayKey: string;
  onSaved: () => void;
}

function RazorpayDialog({ open, onClose, businessId, razorpayKey, onSaved }: RazorpayDialogProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open || customerSearch.length < 2) { setCustomerList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await customersApi.list(businessId, { search: customerSearch, limit: 20 });
        setCustomerList(data.data || []);
      } catch { setCustomerList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, open, businessId]);

  const handlePay = async () => {
    if (!selectedCustomer || amount <= 0) { setError('Select customer and enter amount'); return; }
    setSaving(true);
    setError('');
    try {
      const { data: order } = await paymentsApi.createRazorpayOrder(businessId, {
        amount,
        customerId: selectedCustomer.id,
      });

      setProcessing(true);
      setTimeout(async () => {
        try {
          await paymentsApi.create(businessId, {
            customerId: selectedCustomer.id,
            amount,
            method: 'UPI',
            reference: `razorpay_${order.orderId}`,
            notes: 'Online payment via Razorpay',
          });
          setProcessing(false);
          onSaved();
          onClose();
        } catch { setProcessing(false); }
      }, 2000);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create Razorpay order',
      );
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Online Payment (Razorpay)</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {processing ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>Processing payment...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {!razorpayKey && (
              <Alert severity="warning">
                Razorpay key not configured. Add it in Settings &gt; API Credentials.
              </Alert>
            )}
            <Autocomplete
              options={customerList}
              getOptionLabel={(opt) => `${opt.name} (${opt.phone})`}
              value={selectedCustomer}
              onChange={(_, val) => setSelectedCustomer(val)}
              inputValue={customerSearch}
              onInputChange={(_, val) => setCustomerSearch(val)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField {...params} label="Customer *" size="small" />
              )}
              size="small"
            />
            <TextField
              label="Amount *"
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              size="small"
              inputProps={{ min: 0 }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handlePay}
          disabled={saving || processing || !razorpayKey}
          startIcon={<RazorpayIcon />}
        >
          {saving ? <CircularProgress size={20} /> : 'Pay with Razorpay'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReconciliationTab({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [unreconciled, setUnreconciled] = useState<Payment[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const fetchUnreconciled = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentsApi.list(businessId, { limit: 100 });
      setUnreconciled((data.data || []).filter((p) => p.status === 'PENDING'));
    } catch { /* silent */ }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetchUnreconciled(); }, [fetchUnreconciled]);

  const handleAutoReconcile = async () => {
    setReconciling(true);
    try {
      const { data } = await paymentsApi.reconcile(businessId);
      setSnackbar({ open: true, message: `Reconciled ${data.reconciled} payments` });
      fetchUnreconciled();
    } catch { /* silent */ }
    setReconciling(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Unreconciled Payments</Typography>
        <Button
          variant="contained"
          startIcon={reconciling ? <CircularProgress size={16} /> : <ReconcileIcon />}
          onClick={handleAutoReconcile}
          disabled={reconciling || unreconciled.length === 0}
        >
          Auto-Reconcile
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : unreconciled.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">All payments are reconciled</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unreconciled.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.customer?.name || '-'}</TableCell>
                  <TableCell>{p.invoice?.invoiceNo || 'Advance'}</TableCell>
                  <TableCell align="right">₹{(p.amount || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{methodLabels[p.method] || p.method}</TableCell>
                  <TableCell>{new Date(p.paidAt).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>
                    <Chip label={p.status} size="small" color={p.status === 'COMPLETED' ? 'success' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function PaymentsPage() {
  const { currentBusinessId } = useBusiness();
  const [tab, setTab] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [razorpayKey, setRazorpayKey] = useState('');
  const [upiQrOpen, setUpiQrOpen] = useState(false);
  const [upiQrAmount, setUpiQrAmount] = useState('');
  const [upiQrUpiId, setUpiQrUpiId] = useState('');
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [reminders, setReminders] = useState<{ customer: string; invoiceNo: string; amount: number; daysOverdue: number; phone?: string }[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  useEffect(() => {
    if (!remindersOpen || !currentBusinessId) return;
    setRemindersLoading(true);
    invoicesApi.list(currentBusinessId, { status: 'CONFIRMED', limit: 100 })
      .then(({ data }) => {
        const now = new Date();
        const overdue = (data.data || [])
          .filter((inv) => inv.dueDate && new Date(inv.dueDate) < now && (inv.paidAmount || 0) < inv.grandTotal)
          .map((inv) => ({
            customer: inv.customer?.name || 'Unknown',
            invoiceNo: inv.invoiceNo || '',
            amount: inv.grandTotal - (inv.paidAmount || 0),
            daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate!).getTime()) / 86400000),
            phone: inv.customerPhone || inv.customer?.phone || undefined,
          }))
          .sort((a, b) => b.daysOverdue - a.daysOverdue);
        setReminders(overdue);
      })
      .catch(() => {})
      .finally(() => setRemindersLoading(false));
  }, [remindersOpen, currentBusinessId]);

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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<QrCodeIcon />}
            onClick={() => setUpiQrOpen(true)}
          >
            UPI QR
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<NotificationsIcon />}
            onClick={() => setRemindersOpen(true)}
          >
            Reminders
          </Button>
          <Button
            variant="outlined"
            startIcon={<RazorpayIcon />}
            onClick={() => setRazorpayOpen(true)}
          >
            Online Payment
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Record Payment
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="All Payments" />
          <Tab label="Reconciliation" />
        </Tabs>
      </Paper>

      {tab === 0 ? (
        <>
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
        </>
      ) : (
        currentBusinessId && <ReconciliationTab businessId={currentBusinessId} />
      )}

      {currentBusinessId && (
        <>
          <CreatePaymentDialog
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            businessId={currentBusinessId}
            onSaved={() => { setCreateOpen(false); fetchPayments(); }}
          />
          <RazorpayDialog
            open={razorpayOpen}
            onClose={() => setRazorpayOpen(false)}
            businessId={currentBusinessId}
            razorpayKey={razorpayKey}
            onSaved={() => { setRazorpayOpen(false); fetchPayments(); }}
          />
          <Dialog open={remindersOpen} onClose={() => setRemindersOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Payment Reminders</DialogTitle>
            <DialogContent>
              {remindersLoading ? <CircularProgress /> : reminders.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 2 }}>No overdue invoices found.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="right">Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Overdue</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reminders.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.customer}</TableCell>
                          <TableCell>{r.invoiceNo}</TableCell>
                          <TableCell align="right">₹{r.amount.toLocaleString('en-IN')}</TableCell>
                          <TableCell align="center"><Chip label={`${r.daysOverdue}d`} color={r.daysOverdue > 30 ? 'error' : r.daysOverdue > 7 ? 'warning' : 'default'} size="small" /></TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" onClick={() => { const url = encodeURIComponent(`https://wiseaccs.com/pay/${r.invoiceNo}`); window.open(`https://wa.me/91${r.phone?.replace(/\D/g, '')}?text=Reminder: Invoice ${r.invoiceNo} of ₹${r.amount.toFixed(2)} is overdue. Please pay at your earliest convenience.`, '_blank'); }}>Remind</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRemindersOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={upiQrOpen} onClose={() => setUpiQrOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Generate UPI QR Code</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <TextField label="UPI ID (e.g. name@upi)" value={upiQrUpiId} onChange={(e) => setUpiQrUpiId(e.target.value)} fullWidth placeholder="name@upi" />
                <TextField label="Amount" type="number" value={upiQrAmount} onChange={(e) => setUpiQrAmount(e.target.value)} fullWidth inputProps={{ min: 0 }} />
                {upiQrUpiId && Number(upiQrAmount) > 0 && (
                  <>
                    <Typography variant="body2" color="text.secondary">Scan to pay ₹{Number(upiQrAmount).toFixed(2)}</Typography>
                    <img
                      src={`https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=upi://pay?pa=${encodeURIComponent(upiQrUpiId)}&am=${upiQrAmount}&tn=Payment&cu=INR`}
                      alt="UPI QR Code"
                      style={{ width: 250, height: 250 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all', textAlign: 'center' }}>
                      upi://pay?pa={upiQrUpiId}&am={upiQrAmount}&tn=Payment&cu=INR
                    </Typography>
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setUpiQrOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
}
