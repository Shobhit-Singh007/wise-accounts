import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Typography, TextField, Alert, CircularProgress,
  Grid, Divider, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, FormControlLabel,
  Radio, RadioGroup, Autocomplete, Snackbar, InputAdornment,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { invoicesApi, Invoice, InvoiceItem } from '../api/invoices';
import { customersApi, Customer } from '../api/customers';
import { productsApi, Product } from '../api/products';
import { useBusiness } from '../context/BusinessContext';

interface LineItem {
  productId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  taxRate: number;
}

function calcItemTax(item: LineItem) {
  const gross = item.quantity * item.rate;
  const discountAmt = gross * (item.discount / 100);
  const taxable = gross - discountAmt;
  const cgst = taxable * (item.taxRate / 200);
  const sgst = taxable * (item.taxRate / 200);
  const igst = 0;
  return { taxable, cgst, sgst, igst, total: taxable + cgst + sgst };
}

function calcTotals(items: LineItem[]) {
  let subtotal = 0, taxAmount = 0, discount = 0, grandTotal = 0;
  for (const item of items) {
    const t = calcItemTax(item);
    subtotal += t.taxable;
    taxAmount += t.cgst + t.sgst + t.igst;
    discount += item.quantity * item.rate * (item.discount / 100);
    grandTotal += t.total;
  }
  return { subtotal: parseFloat(subtotal.toFixed(2)), taxAmount: parseFloat(taxAmount.toFixed(2)), discount: parseFloat(discount.toFixed(2)), grandTotal: parseFloat(grandTotal.toFixed(2)) };
}

const emptyItem: LineItem = { itemName: '', quantity: 1, unit: 'piece', rate: 0, discount: 0, taxRate: 18 };

const TAX_RATES = [0, 5, 18, 28, 40];

export default function EditInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { currentBusinessId } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [type, setType] = useState<'B2B' | 'B2C'>('B2C');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [partyList, setPartyList] = useState<Customer[]>([]);
  const [selectedParty, setSelectedParty] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!currentBusinessId || !invoiceId) return;
    setLoading(true);
    invoicesApi.getById(currentBusinessId, invoiceId)
      .then(({ data }) => {
        setInvoice(data);
        setType(data.type);
        setInvoiceNo(data.invoiceNo || '');
        setInvoiceDate(data.invoiceDate?.slice(0, 10) || '');
        setDueDate(data.dueDate?.slice(0, 10) || '');
        setNotes(data.notes || '');
        setTerms(data.terms || '');
        if (data.items) {
          setItems(data.items.map((it: InvoiceItem) => ({
            productId: it.productId || undefined,
            itemName: it.itemName,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            discount: it.discount,
            taxRate: it.taxRate,
          })));
        }
        const party = data.direction === 'SALE' ? data.customer : data.supplier;
        if (party) setSelectedParty(party as unknown as Customer);
      })
      .catch((err) => setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [currentBusinessId, invoiceId]);

  useEffect(() => {
    if (!currentBusinessId || partySearch.length < 2) { setPartyList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await customersApi.list(currentBusinessId, { search: partySearch, limit: 20 });
        setPartyList(data.data || []);
      } catch { setPartyList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [partySearch, currentBusinessId]);

  useEffect(() => {
    if (!currentBusinessId || productSearch.length < 2) { setProductList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await productsApi.list(currentBusinessId, { search: productSearch, limit: 20 });
        setProductList(data.data || []);
      } catch { setProductList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, currentBusinessId]);

  const updateItem = (idx: number, field: keyof LineItem, value: unknown) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!currentBusinessId || !invoice) return;
    if (items.length === 0 || items.every((it) => !it.itemName.trim())) {
      setError('Add at least one item');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        type,
        invoiceNo: invoiceNo || undefined,
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.filter((it) => it.itemName.trim()).map((it) => ({
          productId: it.productId,
          itemName: it.itemName,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          discount: it.discount || undefined,
          taxRate: it.taxRate || undefined,
        })),
      };
      if (selectedParty) {
        if (invoice.direction === 'SALE') payload.customerId = selectedParty.id;
        else payload.supplierId = selectedParty.id;
      }
      await invoicesApi.update(currentBusinessId, invoice.id, payload);
      setSnackbar({ open: true, message: 'Invoice updated', severity: 'success' });
      setTimeout(() => navigate('/invoices'), 1500);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const totals = calcTotals(items);
  const direction = invoice?.direction || 'SALE';
  const partyLabel = direction === 'SALE' ? 'Customer' : 'Supplier';

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  if (error && !invoice) {
    return (
      <Box sx={{ p: 3 }}>
        <IconButton onClick={() => navigate('/invoices')}><ArrowBackIcon /></IconButton>
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/invoices')}><ArrowBackIcon /></IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, flex: 1 }}>Edit Invoice</Typography>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Changes'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <RadioGroup row value={type} onChange={(e) => setType(e.target.value as 'B2B' | 'B2C')}>
              <FormControlLabel value="B2B" control={<Radio size="small" />} label="B2B" />
              <FormControlLabel value="B2C" control={<Radio size="small" />} label="B2C" />
            </RadioGroup>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={partyList}
              getOptionLabel={(opt) => `${opt.name} (${opt.phone})`}
              value={selectedParty}
              onChange={(_, val) => setSelectedParty(val)}
              inputValue={partySearch}
              onInputChange={(_, val) => setPartySearch(val)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label={partyLabel} size="small" />}
              size="small"
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Invoice #" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} size="small" fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Items</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addItem}>Add Item</Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
<TableCell align="center" sx={{ width: 100 }}>Qty</TableCell>
<TableCell align="center" sx={{ width: 90 }}>Unit</TableCell>
<TableCell align="right" sx={{ width: 130 }}>Rate</TableCell>
<TableCell align="center" sx={{ width: 90 }}>Disc %</TableCell>
<TableCell align="center" sx={{ width: 90 }}>GST %</TableCell>
<TableCell align="right" sx={{ width: 120 }}>Amount</TableCell>
                <TableCell sx={{ width: 40 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const t = calcItemTax(item);
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        placeholder="Search product..."
                        size="small"
                        sx={{ minWidth: 180 }}
                        value={item.itemName}
                        onChange={(e) => {
                          updateItem(idx, 'itemName', e.target.value);
                          updateItem(idx, 'productId', undefined);
                          setProductSearch(e.target.value);
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <TextField type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} size="small" sx={{ width: 80 }} inputProps={{ min: 0 }} />
                    </TableCell>
                    <TableCell align="center">
                      <TextField value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} size="small" sx={{ width: 80 }} />
                    </TableCell>
                    <TableCell align="right">
                      <TextField type="number" value={item.rate} onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))} size="small" sx={{ width: 110 }} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
                    </TableCell>
                    <TableCell align="center">
                      <TextField type="number" value={item.discount} onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))} size="small" sx={{ width: 75 }} inputProps={{ min: 0, max: 100 }} />
                    </TableCell>
                    <TableCell align="center">
                      <TextField type="number" value={item.taxRate} onChange={(e) => updateItem(idx, 'taxRate', Number(e.target.value))} size="small" sx={{ width: 75 }} inputProps={{ min: 0 }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>₹{t.total.toFixed(2)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Tax: ₹{(t.cgst + t.sgst).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => removeItem(idx)} disabled={items.length <= 1}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ minWidth: 280 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">₹{totals.subtotal.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Discount</Typography>
              <Typography variant="body2">-₹{totals.discount.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Tax</Typography>
              <Typography variant="body2">₹{totals.taxAmount.toFixed(2)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
              <Typography variant="subtitle1" fontWeight={700}>₹{totals.grandTotal.toFixed(2)}</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={3} fullWidth size="small" />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} multiline rows={3} fullWidth size="small" />
          </Grid>
        </Grid>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
