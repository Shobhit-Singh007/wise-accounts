import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Tooltip,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AccountBalance as LedgerIcon,
  Add as AddIcon,
  TrendingDown as GaveIcon,
  TrendingUp as GotIcon,
  PictureAsPdf as PdfIcon,
  Sms as SmsIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { customersApi } from '../api/customers';
import { useBusiness } from '../context/BusinessContext';

interface LedgerCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gstin: string | null;
  address: string;
  city: string;
  state: string;
  creditLimit: number;
  currentBalance: number;
}

interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  totalEntries: number;
}

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  invoiceNo?: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  imageUrl?: string;
}

interface LedgerData {
  customer: LedgerCustomer;
  summary: LedgerSummary;
  entries: LedgerEntry[];
}

function formatCurrency(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const paymentModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];
const paymentModeLabels: Record<string, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Transfer',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export default function CustomerLedgerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { currentBusinessId } = useBusiness();
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState<'GAVE' | 'RECEIVED'>('GAVE');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryPaymentMode, setEntryPaymentMode] = useState('CASH');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryReference, setEntryReference] = useState('');
  const [entryImage, setEntryImage] = useState<File | null>(null);
  const [entryImagePreview, setEntryImagePreview] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSms, setSendingSms] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchLedger = () => {
    if (!currentBusinessId || !customerId) return;
    setLoading(true);
    setError('');
    customersApi
      .getLedger(currentBusinessId, customerId)
      .then(({ data: d }) => {
        setData(d);
        setSmsPhone(d.customer?.phone || '');
      })
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load ledger',
        ),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLedger();
  }, [currentBusinessId, customerId]);

  const openEntryDialog = (type: 'GAVE' | 'RECEIVED') => {
    setEntryType(type);
    setEntryAmount('');
    setEntryPaymentMode('CASH');
    setEntryDescription('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryReference('');
    setEntryImage(null);
    setEntryImagePreview('');
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!currentBusinessId || !customerId) return;
    if (!entryAmount || Number(entryAmount) <= 0) {
      setSnackbar({ open: true, message: 'Enter a valid amount', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (entryImage) {
        const uploadResult = await customersApi.uploadLedgerImage(currentBusinessId, customerId, entryImage);
        imageUrl = uploadResult.data.url;
      }
      await customersApi.createLedgerEntry(currentBusinessId, customerId, {
        amount: Number(entryAmount),
        type: entryType,
        paymentMode: entryPaymentMode,
        description: entryDescription || undefined,
        date: entryDate || undefined,
        reference: entryReference || undefined,
        imageUrl,
      });
      setEntryDialogOpen(false);
      setSnackbar({
        open: true,
        message: entryType === 'GAVE' ? 'Debit entry added successfully' : 'Credit entry added successfully',
        severity: 'success',
      });
      fetchLedger();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add entry',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!currentBusinessId || !customerId) return;
    if (!confirm('Delete this transaction?')) return;
    try {
      await customersApi.deleteLedgerEntry(currentBusinessId, customerId, entryId);
      setSnackbar({ open: true, message: 'Transaction deleted', severity: 'success' });
      fetchLedger();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete',
        severity: 'error',
      });
    }
  };

  const handlePrintPdf = async () => {
    if (!currentBusinessId || !customerId) return;
    try {
      const url = customersApi.getLedgerPdfUrl(currentBusinessId, customerId);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Ledger_${data?.customer?.name?.replace(/\s+/g, '_') || 'Customer'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to download PDF', severity: 'error' });
    }
  };

  const openSmsDialog = () => {
    setSmsPhone(data?.customer?.phone || '');
    setSmsMessage('');
    setSmsDialogOpen(true);
  };

  const handleSendSms = async () => {
    if (!currentBusinessId || !customerId) return;
    setSendingSms(true);
    try {
      const result = await customersApi.sendLedgerSms(currentBusinessId, customerId, {
        phone: smsPhone || undefined,
        message: smsMessage || undefined,
      });
      setSmsDialogOpen(false);
      setSnackbar({
        open: true,
        message: `SMS sent to ${result.data.phone}`,
        severity: 'success',
      });
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send SMS',
        severity: 'error',
      });
    } finally {
      setSendingSms(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <IconButton onClick={() => navigate('/customers')} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  const { customer, summary, entries } = data;
  const isPositive = summary.closingBalance >= 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/customers')}>
          <ArrowBackIcon />
        </IconButton>
        <LedgerIcon sx={{ color: '#1a237e' }} />
        <Typography variant="h4" sx={{ fontWeight: 600, flex: 1 }}>
          Customer Ledger
        </Typography>
        <Tooltip title="Print / Download PDF">
          <IconButton onClick={handlePrintPdf} sx={{ color: '#e53935' }}>
            <PdfIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Send SMS to Customer">
          <IconButton onClick={openSmsDialog} sx={{ color: '#1565c0' }}>
            <SmsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              {customer.name}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.25 }}>
              {customer.phone}{customer.email ? ` | ${customer.email}` : ''}
            </Typography>
            {customer.gstin && (
              <Typography variant="body2" sx={{ opacity: 0.85, mb: 0.25 }}>
                GSTIN: {customer.gstin}
              </Typography>
            )}
            {customer.address && (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {customer.address}, {customer.city}, {customer.state}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center', px: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>Current Balance</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(customer.currentBalance)}
                </Typography>
              </Box>
              {customer.creditLimit > 0 && (
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>Credit Limit</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatCurrency(customer.creditLimit)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<GaveIcon />}
          onClick={() => openEntryDialog('GAVE')}
          sx={{
            flex: 1,
            py: 2,
            bgcolor: '#e53935',
            '&:hover': { bgcolor: '#c62828' },
            fontWeight: 700,
            fontSize: '1.1rem',
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          You Gave
        </Button>
        <Button
          variant="contained"
          startIcon={<GotIcon />}
          onClick={() => openEntryDialog('RECEIVED')}
          sx={{
            flex: 1,
            py: 2,
            bgcolor: '#2e7d32',
            '&:hover': { bgcolor: '#1b5e20' },
            fontWeight: 700,
            fontSize: '1.1rem',
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          You Got
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: '3px solid #ff8f00' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Opening Balance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: summary.openingBalance >= 0 ? '#e65100' : 'success.main' }}>
                {formatCurrency(summary.openingBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: '3px solid #e53935' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Debit</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#e53935' }}>
                {formatCurrency(summary.totalDebit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: '3px solid #2e7d32' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Total Credit</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32' }}>
                {formatCurrency(summary.totalCredit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderTop: `3px solid ${isPositive ? '#e53935' : '#2e7d32'}` }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Closing Balance</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: isPositive ? '#e53935' : '#2e7d32' }}>
                {formatCurrency(summary.closingBalance)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Transaction History ({summary.totalEntries} entries)
          </Typography>
        </Box>

        {entries.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="h6">
              No transactions yet
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Use "You Gave" or "You Got" to add entries
            </Typography>
          </Box>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#1a237e' }}>
                {['Date', 'Description', 'Invoice #', 'Debit (Dr)', 'Credit (Cr)', 'Balance', ''].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{
                      p: 1.5,
                      textAlign: h === 'Description' || h === '' ? 'left' : h === 'Date' ? 'left' : 'right',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      borderBottom: '2px solid #ff8f00',
                      width: h === '' ? '60px' : h === 'Invoice #' ? '12%' : h === 'Date' ? '14%' : '16%',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {entries.map((entry, idx) => {
                const isInvoice = entry.type.includes('INVOICE');
                const isPayment = entry.type.includes('PAYMENT');
                const isOpening = entry.type === 'OPENING_BALANCE';
                const isGave = entry.type === 'LEDGER_GAVE';
                const isReceived = entry.type === 'LEDGER_RECEIVED';
                const isStandalone = isGave || isReceived;
                const balancePositive = entry.balanceAfter >= 0;

                return (
                  <Box
                    key={entry.id}
                    component="tr"
                    sx={{
                      bgcolor: idx % 2 === 0 ? 'white' : '#fafafa',
                      '&:hover': { bgcolor: '#e8eaf6' },
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.85rem',
                        color: 'text.secondary',
                        borderBottom: '1px solid #f0f0f0',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(entry.date)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: isOpening ? 700 : isInvoice || isGave ? 500 : 400,
                        borderBottom: '1px solid #f0f0f0',
                        color: isOpening ? '#1a237e' : isGave ? '#c62828' : 'text.primary',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isInvoice && (
                          <Chip label="Dr" size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {isGave && (
                          <Chip label="Dr" size="small" sx={{ bgcolor: '#ffebee', color: '#c62828', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {isPayment && (
                          <Chip label="Cr" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {isReceived && (
                          <Chip label="Cr" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {isOpening && (
                          <Chip label="OB" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                        )}
                        {entry.description}
                        {entry.imageUrl && (
                          <Box
                            component="img"
                            src={entry.imageUrl}
                            alt="Attachment"
                            sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, mt: 0.5, cursor: 'pointer', border: '1px solid #e0e0e0' }}
                            onClick={() => window.open(entry.imageUrl, '_blank')}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'right',
                      }}
                    >
                      {entry.invoiceNo || '-'}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: entry.debit > 0 ? '#c62828' : 'text.secondary',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'right',
                      }}
                    >
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: entry.credit > 0 ? '#2e7d32' : 'text.secondary',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'right',
                      }}
                    >
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: balancePositive ? '#c62828' : '#2e7d32',
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'right',
                        bgcolor: idx === entries.length - 1 ? (balancePositive ? '#fff3e0' : '#e8f5e9') : 'transparent',
                      }}
                    >
                      {formatCurrency(entry.balanceAfter)}
                    </Box>
                    <Box
                      component="td"
                      sx={{
                        p: 1.5,
                        borderBottom: '1px solid #f0f0f0',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isStandalone && (
                        <IconButton size="small" onClick={() => handleDeleteEntry(entry.id)} sx={{ color: '#e53935' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            <Box component="tfoot">
              <Box component="tr" sx={{ bgcolor: '#e8eaf6' }}>
                <Box component="td" sx={{ p: 1.5, fontWeight: 700, fontSize: '0.85rem' }} colSpan={3}>
                  TOTAL
                </Box>
                <Box
                  component="td"
                  sx={{ p: 1.5, fontWeight: 700, textAlign: 'right', color: '#c62828', fontSize: '0.9rem' }}
                >
                  {formatCurrency(summary.totalDebit)}
                </Box>
                <Box
                  component="td"
                  sx={{ p: 1.5, fontWeight: 700, textAlign: 'right', color: '#2e7d32', fontSize: '0.9rem' }}
                >
                  {formatCurrency(summary.totalCredit)}
                </Box>
                <Box
                  component="td"
                  sx={{
                    p: 1.5,
                    fontWeight: 700,
                    textAlign: 'right',
                    color: isPositive ? '#c62828' : '#2e7d32',
                    fontSize: '0.9rem',
                    bgcolor: isPositive ? '#ffe0b2' : '#c8e6c9',
                  }}
                >
                  {formatCurrency(summary.closingBalance)}
                </Box>
                <Box component="td" sx={{ p: 1.5 }} />
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: entryType === 'GAVE' ? '#c62828' : '#2e7d32' }}>
          {entryType === 'GAVE' ? '💸 You Gave (Debit)' : '💰 You Got (Credit)'}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {entryType === 'GAVE' ? 'Customer now owes you more' : 'Customer has paid you'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              value={entryAmount}
              onChange={(e) => setEntryAmount(e.target.value)}
              required
              fullWidth
              autoFocus
              inputProps={{ min: 1 }}
            />
            <TextField
              select
              label="Payment Mode"
              value={entryPaymentMode}
              onChange={(e) => setEntryPaymentMode(e.target.value)}
              fullWidth
            >
              {paymentModes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {paymentModeLabels[mode] || mode}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description"
              value={entryDescription}
              onChange={(e) => setEntryDescription(e.target.value)}
              fullWidth
              placeholder={entryType === 'GAVE' ? 'e.g., Advance for order' : 'e.g., Cash payment received'}
            />
            <TextField
              label="Reference Number"
              value={entryReference}
              onChange={(e) => setEntryReference(e.target.value)}
              fullWidth
              placeholder="e.g., UPI ref, cheque number"
            />
            <Box sx={{ border: '2px dashed #ccc', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#1a237e' } }}>
              <input
                type="file"
                accept="image/*"
                id="ledger-image-upload"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEntryImage(file);
                    setEntryImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
              <label htmlFor="ledger-image-upload" style={{ cursor: 'pointer' }}>
                {entryImagePreview ? (
                  <Box>
                    <img src={entryImagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 8 }} />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Click to change</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography color="text.secondary">📷 Tap to attach photo</Typography>
                    <Typography variant="caption" color="text.secondary">Receipt, payment proof, etc.</Typography>
                  </Box>
                )}
              </label>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveEntry}
            disabled={saving || !entryAmount}
            sx={{
              bgcolor: entryType === 'GAVE' ? '#e53935' : '#2e7d32',
              '&:hover': { bgcolor: entryType === 'GAVE' ? '#c62828' : '#1b5e20' },
              fontWeight: 700,
            }}
          >
            {saving ? <CircularProgress size={20} /> : entryType === 'GAVE' ? 'Add Debit' : 'Add Credit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={smsDialogOpen} onClose={() => setSmsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          📱 Send Ledger SMS
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Send balance update and ledger link to customer
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Phone Number"
              value={smsPhone}
              onChange={(e) => setSmsPhone(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Custom Message (optional)"
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Leave empty for default message with balance and ledger link"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendSms}
            disabled={sendingSms || !smsPhone}
            startIcon={<SmsIcon />}
            sx={{ bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' }, fontWeight: 700 }}
          >
            {sendingSms ? <CircularProgress size={20} /> : 'Send SMS'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
