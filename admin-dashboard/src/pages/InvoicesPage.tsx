import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider,
  Tabs,
  Tab,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  Autocomplete,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  MoreVert as MoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  LocalShipping as EwayIcon,
  Receipt as EinvoiceIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import DataTable from '../components/DataTable';
import {
  invoicesApi,
  type Invoice,
  type CreateInvoiceRequest,
  type InvoiceItem,
  type InvoiceTemplate,
} from '../api/invoices';
import { customersApi, type Customer } from '../api/customers';
import { productsApi, type Product } from '../api/products';
import { useBusiness } from '../context/BusinessContext';
import { generateQrCodeSvg } from '../utils/barcodeUtils';
import ExportMenu from '../components/ExportMenu';
import { fetchAllPages } from '../utils/exportUtils';
import client from '../api/client';


const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  CONFIRMED: 'success',
  DRAFT: 'default',
  CANCELLED: 'error',
  PENDING: 'warning',
};

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
  let subtotal = 0;
  let taxAmount = 0;
  let discount = 0;
  for (const item of items) {
    const gross = item.quantity * item.rate;
    const disc = gross * (item.discount / 100);
    discount += disc;
    const { taxable, cgst, sgst } = calcItemTax(item);
    subtotal += taxable;
    taxAmount += cgst + sgst;
  }
  const grandTotal = subtotal + taxAmount;
  return { subtotal, taxAmount, discount, grandTotal };
}

const emptyItem: LineItem = { itemName: '', quantity: 1, unit: 'piece', rate: 0, discount: 0, taxRate: 18 };

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  direction: 'SALE' | 'PURCHASE';
  editInvoice?: Invoice | null;
  onSaved: () => void;
}

function CreateInvoiceDialog({ open, onClose, businessId, direction, editInvoice, onSaved }: CreateInvoiceDialogProps) {
  const isEdit = !!editInvoice;
  const partyLabel = direction === 'SALE' ? 'Customer' : 'Supplier';

  const [type, setType] = useState<'B2B' | 'B2C'>(editInvoice?.type || 'B2C');
  const [partySearch, setPartySearch] = useState('');
  const [partyList, setPartyList] = useState<Customer[]>([]);
  const [selectedParty, setSelectedParty] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(editInvoice?.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(editInvoice?.dueDate?.slice(0, 10) || '');
  const [items, setItems] = useState<LineItem[]>(
    editInvoice?.items?.map((it) => ({
      productId: it.productId || undefined,
      itemName: it.itemName,
      quantity: it.quantity,
      unit: it.unit,
      rate: it.rate,
      discount: it.discount,
      taxRate: it.taxRate,
    })) || [{ ...emptyItem }]
  );
  const [notes, setNotes] = useState(editInvoice?.notes || '');
  const [terms, setTerms] = useState(editInvoice?.terms || '');
  const [poNo, setPoNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [cessTotal, setCessTotal] = useState(0);
  const [totalInWords, setTotalInWords] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState<Product[]>([]);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', gstin: '', address: '', city: '', state: '', pincode: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerGstinLoading, setCustomerGstinLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editInvoice) {
      setType(editInvoice.type);
      setInvoiceDate(editInvoice.invoiceDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
      setDueDate(editInvoice.dueDate?.slice(0, 10) || '');
      setItems(
        editInvoice.items?.map((it) => ({
          productId: it.productId || undefined,
          itemName: it.itemName,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          discount: it.discount,
          taxRate: it.taxRate,
        })) || [{ ...emptyItem }]
      );
      setNotes(editInvoice.notes || '');
      setTerms(editInvoice.terms || '');
    } else {
      setType('B2C');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setItems([{ ...emptyItem }]);
      setNotes('');
      setTerms('');
    }
    setPartySearch('');
    setSelectedParty(null);
    setProductSearch('');
    setProductList([]);
    setError('');
  }, [open, editInvoice]);

  useEffect(() => {
    if (!open || partySearch.length < 2) { setPartyList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await customersApi.list(businessId, { search: partySearch, limit: 20 });
        setPartyList(data.data || []);
      } catch { setPartyList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [partySearch, open, businessId]);

  useEffect(() => {
    if (!open || productSearch.length < 2) { setProductList([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await productsApi.list(businessId, { search: productSearch, limit: 20 });
        setProductList(data.data || []);
      } catch { setProductList([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, open, businessId]);

  useEffect(() => {
    if (editInvoice && open) {
      if (direction === 'SALE' && editInvoice.customer) {
        setSelectedParty(editInvoice.customer as unknown as Customer);
      } else if (direction === 'PURCHASE' && editInvoice.supplier) {
        setSelectedParty(editInvoice.supplier as unknown as Customer);
      }
    }
  }, [editInvoice, open, direction]);

  const totals = calcTotals(items);

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const updateAmount = (idx: number, amount: number) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const qty = it.quantity || 1;
      const disc = it.discount || 0;
      const rate = qty > 0 ? Number(((amount / qty) / (1 - disc / 100)).toFixed(2)) : 0;
      return { ...it, rate };
    }));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const selectProduct = (idx: number, product: Product | null) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      if (!product) return { ...it, productId: undefined, itemName: '' };
      return {
        ...it,
        productId: product.id,
        itemName: product.name,
        rate: product.sellingPrice,
        unit: product.unit,
        taxRate: product.taxRate,
      };
    }));
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    setSavingCustomer(true);
    try {
      const { data } = await customersApi.create(businessId, newCustomer);
      setSelectedParty(data);
      if (data.gstin) setType('B2B');
      setAddCustomerOpen(false);
      setNewCustomer({ name: '', phone: '', gstin: '', address: '', city: '', state: '', pincode: '' });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create customer');
    }
    setSavingCustomer(false);
  };

  const lookupNewCustomerGstin = async () => {
    if (!newCustomer.gstin || newCustomer.gstin.length < 15) return;
    setCustomerGstinLoading(true);
    try {
      const { data } = await client.get(`/businesses/${businessId}/customers/gstin/${newCustomer.gstin}`);
      if (data && data.name) {
        setNewCustomer((prev) => ({
          ...prev,
          name: prev.name || data.tradeName || data.name || '',
          address: prev.address || data.address || '',
          city: prev.city || data.city || '',
          state: prev.state || data.state || '',
          pincode: prev.pincode || data.pincode || '',
        }));
      }
    } catch { /* silent */ }
    setCustomerGstinLoading(false);
  };

  const handleSave = async () => {
    if (items.length === 0 || items.every((it) => !it.itemName.trim())) {
      setError('Add at least one item');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: CreateInvoiceRequest = {
        type,
        direction,
        invoiceDate: invoiceDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        discount: totals.discount,
        items: items
          .filter((it) => it.itemName.trim())
          .map((it) => ({
            productId: it.productId,
            itemName: it.itemName,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            discount: it.discount || undefined,
            taxRate: it.taxRate || undefined,
            batchNo: undefined,
          })),
      };
      if (poNo) payload.poNo = poNo;
      if (challanNo) payload.challanNo = challanNo;
      if (lrNo) payload.lrNo = lrNo;
      if (paymentType) payload.paymentType = paymentType;
      if (placeOfSupply) payload.placeOfSupply = placeOfSupply;
      if (cessTotal > 0) payload.cessTotal = cessTotal;
      if (totalInWords) payload.totalInWords = totalInWords;
      if (direction === 'SALE' && selectedParty) payload.customerId = selectedParty.id;
      if (direction === 'PURCHASE' && selectedParty) payload.supplierId = selectedParty.id;

      if (isEdit && editInvoice) {
        await invoicesApi.update(businessId, editInvoice.id, payload);
      } else {
        await invoicesApi.create(businessId, payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save invoice',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {isEdit ? 'Edit Invoice' : `New ${direction === 'SALE' ? 'Sale' : 'Purchase'} Invoice`}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <RadioGroup row value={type} onChange={(e) => setType(e.target.value as 'B2B' | 'B2C')}>
            <FormControlLabel value="B2B" control={<Radio size="small" />} label="B2B" />
            <FormControlLabel value="B2C" control={<Radio size="small" />} label="B2C" />
          </RadioGroup>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Autocomplete
                options={partyList}
                getOptionLabel={(opt) => `${opt.name} (${opt.phone})`}
                value={selectedParty}
                onChange={(_, val) => {
                  setSelectedParty(val);
                  if (direction === 'SALE' && val?.gstin) {
                    setType('B2B');
                  }
                }}
                inputValue={partySearch}
                onInputChange={(_, val) => setPartySearch(val)}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                  <TextField {...params} label={partyLabel} placeholder={`Search ${partyLabel.toLowerCase()}...`} size="small" />
                )}
                size="small"
                sx={{ flex: 1 }}
              />
              {direction === 'SALE' && (
                <IconButton size="small" onClick={() => setAddCustomerOpen(true)} title="Add new customer">
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="PO No" value={poNo} onChange={(e) => setPoNo(e.target.value)} size="small" fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Challan No" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} size="small" fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="LR No" value={lrNo} onChange={(e) => setLrNo(e.target.value)} size="small" fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Place of Supply" value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} size="small" fullWidth />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField label="Payment Type" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} size="small" fullWidth />
          </Grid>
        </Grid>

        {selectedParty && direction === 'SALE' && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50', display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              <strong>{selectedParty.name}</strong>
              {selectedParty.gstin && <> &middot; GSTIN: {selectedParty.gstin}</>}
              {selectedParty.state && <> &middot; {selectedParty.state}</>}
              {selectedParty.address && <> &middot; {selectedParty.address}</>}
            </Typography>
          </Paper>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Line Items</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '30%' }}>Item Name</TableCell>
                <TableCell sx={{ width: 70 }} align="center">Qty</TableCell>
                <TableCell sx={{ width: 70 }}>Unit</TableCell>
                <TableCell sx={{ width: 90 }} align="right">Rate</TableCell>
                <TableCell sx={{ width: 70 }} align="center">Disc %</TableCell>
                <TableCell sx={{ width: 80 }} align="center">GST %</TableCell>
                <TableCell sx={{ width: 90 }} align="right">Amount</TableCell>
                <TableCell sx={{ width: 40 }} align="center" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => {
                const { total } = calcItemTax(item);
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Autocomplete
                        freeSolo
                        options={productList}
                        getOptionLabel={(opt) => typeof opt === 'string' ? opt : `${opt.name}${opt.sku ? ` (${opt.sku})` : ''}`}
                        value={productList.find((p) => p.id === item.productId) || null}
                        onChange={(_, val) => {
                          if (typeof val === 'string') {
                            setItems((prev) => prev.map((it, i) => i === idx ? { ...it, itemName: val, productId: undefined } : it));
                          } else {
                            selectProduct(idx, val);
                          }
                        }}
                        inputValue={item.productId ? (productList.find((p) => p.id === item.productId)?.name || item.itemName) : item.itemName}
                        onInputChange={(_, val, reason) => {
                          if (reason === 'input' || reason === 'clear') {
                            setItems((prev) => prev.map((it, i) => i === idx ? { ...it, itemName: val } : it));
                            setProductSearch(val);
                          }
                        }}
                        isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        renderInput={(params) => (
                          <TextField {...params} size="small" placeholder="Type to search product..." />
                        )}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.discount}
                        onChange={(e) => updateItem(idx, 'discount', Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        value={item.taxRate}
                        onChange={(e) => updateItem(idx, 'taxRate', Number(e.target.value))}
                        size="small"
                      >
                        {[0, 5, 12, 18, 28].map((r) => (
                          <MenuItem key={r} value={r}>{r}%</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        type="number"
                        value={total.toFixed(2)}
                        onChange={(e) => updateAmount(idx, Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {items.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Button size="small" startIcon={<AddIcon />} onClick={addItem}>Add Item</Button>

        <Grid container spacing={2} sx={{ mt: 2, mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ minWidth: 250 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Discount</Typography>
              <Typography variant="body2">-₹{totals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Tax</Typography>
              <Typography variant="body2">₹{totals.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
              <Typography variant="subtitle1" fontWeight={700}>₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : isEdit ? 'Update' : 'Save Invoice'}
        </Button>
      </DialogActions>

      <Dialog open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Quick Add Customer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Customer Name *" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} size="small" fullWidth />
            <TextField label="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} size="small" fullWidth />
            <TextField
              label="GSTIN"
              value={newCustomer.gstin}
              onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={lookupNewCustomerGstin} disabled={customerGstinLoading || !newCustomer.gstin || newCustomer.gstin.length < 15}>
                      {customerGstinLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField label="Address" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} size="small" fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={4}><TextField label="City" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} size="small" fullWidth /></Grid>
              <Grid item xs={4}><TextField label="State" value={newCustomer.state} onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })} size="small" fullWidth /></Grid>
              <Grid item xs={4}><TextField label="Pincode" value={newCustomer.pincode} onChange={(e) => setNewCustomer({ ...newCustomer, pincode: e.target.value })} size="small" fullWidth /></Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCustomerOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleQuickAddCustomer} disabled={savingCustomer || !newCustomer.name.trim()}>
            {savingCustomer ? <CircularProgress size={20} /> : 'Add & Select'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

interface InvoiceDetailDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  businessId: string;
  onRefresh: () => void;
}

function InvoiceDetailDialog({ open, onClose, invoice, businessId, onRefresh }: InvoiceDetailDialogProps) {
  const { currentBusiness } = useBusiness();
  const [editOpen, setEditOpen] = useState(false);
  const [ewayOpen, setEwayOpen] = useState(false);
  const [einvoiceOpen, setEinvoiceOpen] = useState(false);
  const [bothOpen, setBothOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState('classic');
  const [showQrCode, setShowQrCode] = useState(false);
  const [docType, setDocType] = useState('INVOICE');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Load active template and QR setting from settings
  useEffect(() => {
    if (!open || !businessId) return;
    invoicesApi.getSettings(businessId)
      .then(({ data }) => {
        const d = data as unknown as Record<string, unknown>;
        setActiveTemplate((d.activeTemplate as string) || 'classic');
        setShowQrCode(d.showQrCode === true);
      })
      .catch(() => {});
  }, [open, businessId]);

  if (!invoice) return null;

  const party = invoice.direction === 'SALE' ? invoice.customer : invoice.supplier;
  const partyLabel = invoice.direction === 'SALE' ? 'Customer' : 'Supplier';
  const hasGstin = party?.gstin;

  const handlePrint = () => {
    invoicesApi.openPrint(businessId, invoice.id, docType === 'INVOICE' ? undefined : docType);
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await invoicesApi.downloadPdf(businessId, invoice.id, docType === 'INVOICE' ? undefined : docType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const labels: Record<string, string> = { INVOICE: 'Invoice', QUOTATION: 'Quotation', PROFORMA: 'Proforma', DELIVERY_CHALLAN: 'Challan', JOBWORK: 'Jobwork', CREDIT_NOTE: 'CreditNote', LETTERHEAD: 'Letterhead' };
      a.download = `${labels[docType] || 'Invoice'}_${invoice.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setSnackbar({ open: true, message: 'Failed to download PDF', severity: 'error' });
    }
  };

  const handleBothGenerated = async (data: any) => {
    try {
      const result = await invoicesApi.generateBoth(businessId, invoice.id, data);
      setSnackbar({ open: true, message: 'E-Way Bill & e-Invoice generated!', severity: 'success' });
      setBothOpen(false);
      onRefresh();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate',
        severity: 'error',
      });
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await invoicesApi.cancel(businessId, invoice.id);
      setSnackbar({ open: true, message: 'Invoice cancelled', severity: 'success' });
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to cancel',
        severity: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice? This cannot be undone.')) return;
    try {
      await invoicesApi.delete(businessId, invoice.id);
      setSnackbar({ open: true, message: 'Invoice deleted', severity: 'success' });
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete',
        severity: 'error',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6">{invoice.invoiceNo}</Typography>
            <Chip label={invoice.status} size="small" color={statusColors[invoice.status] || 'default'} />
            <Chip label={invoice.type} size="small" variant="outlined" />
            <Chip label={invoice.direction} size="small" variant="outlined" />
          </Box>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>From</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {invoice.direction === 'SALE' && currentBusiness?.logoUrl && (
                  <Box
                    component="img"
                    src={currentBusiness.logoUrl.startsWith('http') ? currentBusiness.logoUrl : `/api/v1${currentBusiness.logoUrl}`}
                    alt={currentBusiness.name}
                    sx={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 1 }}
                  />
                )}
                <Typography fontWeight={600}>
                  {invoice.direction === 'SALE' ? (currentBusiness?.name || 'Your Business') : (party?.name || '-')}
                </Typography>
              </Box>
              {invoice.direction === 'SALE' && currentBusiness?.gstin && (
                <Typography variant="body2">GSTIN: {currentBusiness.gstin}</Typography>
              )}
              {invoice.direction === 'SALE' && currentBusiness?.phone && (
                <Typography variant="body2">{currentBusiness.phone}</Typography>
              )}
              {invoice.direction === 'SALE' && currentBusiness?.address && (
                <Typography variant="body2">{currentBusiness.address}{currentBusiness.city ? `, ${currentBusiness.city}` : ''}{currentBusiness.pincode ? ` - ${currentBusiness.pincode}` : ''}</Typography>
              )}
              {invoice.direction === 'PURCHASE' && party?.gstin && (
                <Typography variant="body2">GSTIN: {party.gstin}</Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>{partyLabel}</Typography>
              <Typography fontWeight={600}>{party?.name || '-'}</Typography>
              {party?.phone && <Typography variant="body2">{party.phone}</Typography>}
              {hasGstin && <Typography variant="body2">GSTIN: {party.gstin}</Typography>}
              {party?.address && <Typography variant="body2">{party.address}, {party.city} - {party.pincode}</Typography>}
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Invoice Date</Typography>
              <Typography variant="body2">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Due Date</Typography>
              <Typography variant="body2">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '-'}</Typography>
            </Grid>
            {invoice.poNo && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">PO No</Typography><Typography variant="body2">{invoice.poNo}</Typography></Grid>}
            {invoice.challanNo && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Challan No</Typography><Typography variant="body2">{invoice.challanNo}</Typography></Grid>}
            {invoice.lrNo && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">LR No</Typography><Typography variant="body2">{invoice.lrNo}</Typography></Grid>}
            {invoice.placeOfSupply && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Place of Supply</Typography><Typography variant="body2">{invoice.placeOfSupply}</Typography></Grid>}
            {invoice.paymentType && <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Payment Type</Typography><Typography variant="body2">{invoice.paymentType}</Typography></Grid>}
          </Grid>

          <Divider sx={{ mb: 2 }} />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Rate</TableCell>
                  <TableCell align="right">Disc</TableCell>
                  {hasGstin && (
                    <>
                      <TableCell align="right">Taxable</TableCell>
                      <TableCell align="right">CGST</TableCell>
                      <TableCell align="right">SGST</TableCell>
                    </>
                  )}
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      {item.itemName}
                      {item.batchNo && <Typography variant="caption" display="block" color="text.secondary">Batch: {item.batchNo}</Typography>}
                    </TableCell>
                    <TableCell align="center">{item.quantity} {item.unit}</TableCell>
                    <TableCell align="right">₹{item.rate.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">{item.discount > 0 ? `${item.discount}%` : '-'}</TableCell>
                    {hasGstin && (
                      <>
                        <TableCell align="right">₹{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right">₹{item.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell align="right">₹{item.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      </>
                    )}
                    <TableCell align="right" sx={{ fontWeight: 600 }}>₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box sx={{ minWidth: 280 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              {invoice.discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Discount</Typography>
                  <Typography variant="body2">-₹{invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Tax</Typography>
                <Typography variant="body2">₹{invoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              {invoice.roundOff !== 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Round Off</Typography>
                  <Typography variant="body2">₹{invoice.roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                <Typography variant="subtitle1" fontWeight={700}>₹{invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              {invoice.paidAmount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="body2" color="success.main">Paid</Typography>
                  <Typography variant="body2" color="success.main">₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}
              {invoice.cessTotal ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">CESS</Typography>
                  <Typography variant="body2">₹{invoice.cessTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              ) : null}
              {invoice.totalInWords && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '80%', fontStyle: 'italic' }}>{invoice.totalInWords}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {invoice.ewayBillNo && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EwayIcon fontSize="small" /> E-Way Bill Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">E-Way Bill No</Typography>
                  <Typography variant="body2" fontWeight={600}>{invoice.ewayBillNo}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{invoice.ewayBillDate ? new Date(invoice.ewayBillDate).toLocaleDateString('en-IN') : '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Vehicle No</Typography>
                  <Typography variant="body2">{invoice.vehicleNo || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Transporter</Typography>
                  <Typography variant="body2">{invoice.transporterName || invoice.transporterId || '-'}</Typography>
                </Grid>
              </Grid>
            </>
          )}

          {invoice.irn && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EinvoiceIcon fontSize="small" /> e-Invoice Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">IRN</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all' }}>{invoice.irn}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Ack No</Typography>
                  <Typography variant="body2">{invoice.ackNo || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Ack Date</Typography>
                  <Typography variant="body2">{invoice.ackDate ? new Date(invoice.ackDate).toLocaleDateString('en-IN') : '-'}</Typography>
                </Grid>
              </Grid>
            </>
          )}

          {invoice.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="text.secondary">Notes</Typography>
              <Typography variant="body2">{invoice.notes}</Typography>
            </>
          )}
          {invoice.terms && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Terms</Typography>
              <Typography variant="body2">{invoice.terms}</Typography>
            </Box>
          )}

          {showQrCode && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: generateQrCodeSvg(
                      `INV:${invoice.invoiceNo}|AMT:${invoice.grandTotal}|DATE:${invoice.invoiceDate}|FROM:${invoice.customer?.name || 'N/A'}`,
                      100,
                    ),
                  }}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Scan to verify invoice
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          {invoice.status !== 'CANCELLED' && (
            <Button size="small" variant="contained" color="primary" startIcon={<EwayIcon />} onClick={() => setBothOpen(true)}>
              E-Way Bill & e-Invoice
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="doc-type-label">Document</InputLabel>
            <Select
              labelId="doc-type-label"
              value={docType}
              label="Document"
              onChange={(e) => setDocType(e.target.value)}
            >
              <MenuItem value="INVOICE">Tax Invoice</MenuItem>
              <MenuItem value="QUOTATION">Quotation</MenuItem>
              <MenuItem value="PROFORMA">Proforma Invoice</MenuItem>
              <MenuItem value="DELIVERY_CHALLAN">Delivery Challan</MenuItem>
              <MenuItem value="JOBWORK">Jobwork Challan</MenuItem>
              <MenuItem value="CREDIT_NOTE">Credit Note</MenuItem>
              <MenuItem value="LETTERHEAD">Letterhead</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" startIcon={<PrintIcon />} onClick={handlePrint}>Print</Button>
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleDownloadPdf}>Download PDF</Button>
          {invoice.status !== 'CANCELLED' && (
            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
          )}
          {!invoice.ewayBillNo && invoice.status !== 'CANCELLED' && (
            <Button size="small" startIcon={<EwayIcon />} onClick={() => setEwayOpen(true)}>E-Way Bill</Button>
          )}
          {!invoice.irn && invoice.status !== 'CANCELLED' && (
            <Button size="small" startIcon={<EinvoiceIcon />} onClick={() => setEinvoiceOpen(true)}>e-Invoice</Button>
          )}
          {invoice.status === 'CONFIRMED' && (
            <Button size="small" color="warning" startIcon={<CancelIcon />} onClick={handleCancel}>Cancel Invoice</Button>
          )}
          {invoice.status === 'DRAFT' && (
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>Delete</Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {editOpen && (
        <CreateInvoiceDialog
          open={editOpen}
          onClose={() => { setEditOpen(false); }}
          businessId={businessId}
          direction={invoice.direction}
          editInvoice={invoice}
          onSaved={() => { setEditOpen(false); onRefresh(); }}
        />
      )}

      {ewayOpen && (
        <EwayBillDialog
          open={ewayOpen}
          onClose={() => setEwayOpen(false)}
          businessId={businessId}
          invoice={invoice}
          onSaved={() => { setEwayOpen(false); onRefresh(); }}
        />
      )}

      {einvoiceOpen && (
        <EinvoiceDialog
          open={einvoiceOpen}
          onClose={() => setEinvoiceOpen(false)}
          businessId={businessId}
          invoice={invoice}
          onSaved={() => { setEinvoiceOpen(false); onRefresh(); }}
        />
      )}

      {bothOpen && (
        <BothGenerateDialog
          open={bothOpen}
          onClose={() => setBothOpen(false)}
          onGenerate={handleBothGenerated}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

interface EwayBillDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  invoice: Invoice;
  onSaved: () => void;
}

function EwayBillDialog({ open, onClose, businessId, invoice, onSaved }: EwayBillDialogProps) {
  const [transporterId, setTransporterId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [supplyType, setSupplyType] = useState('Outward');
  const [docType, setDocType] = useState('Tax Invoice');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!vehicleNo.trim()) { setError('Vehicle number is required'); return; }
    setSaving(true);
    setError('');
    try {
      await invoicesApi.generateEwayBill(businessId, invoice.id, {
        transporterId: transporterId || undefined,
        transporterName: transporterName || undefined,
        vehicleNo,
        distanceKm,
        supplyType,
        docType,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to generate E-Way Bill',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate E-Way Bill</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Transporter ID" value={transporterId} onChange={(e) => setTransporterId(e.target.value)} size="small" />
          <TextField label="Transporter Name" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} size="small" />
          <TextField label="Vehicle No *" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} size="small" required />
          <TextField label="Distance (KM)" type="number" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} size="small" />
          <TextField label="Supply Type" select value={supplyType} onChange={(e) => setSupplyType(e.target.value)} size="small">
            <MenuItem value="Outward">Outward</MenuItem>
            <MenuItem value="Inward">Inward</MenuItem>
          </TextField>
          <TextField label="Document Type" select value={docType} onChange={(e) => setDocType(e.target.value)} size="small">
            <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
            <MenuItem value="Bill of Supply">Bill of Supply</MenuItem>
            <MenuItem value="Delivery Challan">Delivery Challan</MenuItem>
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleGenerate} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Generate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface EinvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  invoice: Invoice;
  onSaved: () => void;
}

function EinvoiceDialog({ open, onClose, businessId, invoice, onSaved }: EinvoiceDialogProps) {
  const [mode, setMode] = useState<'api' | 'manual'>('api');
  const [irn, setIrn] = useState('');
  const [ackNo, setAckNo] = useState('');
  const [ackDate, setAckDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (mode === 'manual' && !irn.trim()) { setError('IRN is required'); return; }
    setSaving(true);
    setError('');
    try {
      await invoicesApi.generateEinvoice(businessId, invoice.id, {
        generateViaApi: mode === 'api',
        irn: mode === 'manual' ? irn : undefined,
        ackNo: mode === 'manual' ? ackNo : undefined,
        ackDate: mode === 'manual' ? ackDate : undefined,
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to generate e-Invoice',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate e-Invoice</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <RadioGroup
          row
          value={mode}
          onChange={(e) => setMode(e.target.value as 'api' | 'manual')}
          sx={{ mb: 2, mt: 1 }}
        >
          <FormControlLabel value="api" control={<Radio size="small" />} label="Auto-generate via API" />
          <FormControlLabel value="manual" control={<Radio size="small" />} label="Manual entry" />
        </RadioGroup>

        {mode === 'manual' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="IRN *" value={irn} onChange={(e) => setIrn(e.target.value)} size="small" fullWidth />
            <TextField label="Ack No" value={ackNo} onChange={(e) => setAckNo(e.target.value)} size="small" fullWidth />
            <TextField
              label="Ack Date"
              type="date"
              value={ackDate}
              onChange={(e) => setAckDate(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}
        {mode === 'api' && (
          <Typography variant="body2" color="text.secondary">
            This will automatically generate the e-Invoice via the connected GSTN API using the invoice details.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleGenerate} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Generate'}
        </Button>
      </DialogActions>
      </Dialog>
    );
  }

interface BothGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (data: any) => void;
}

function BothGenerateDialog({ open, onClose, onGenerate }: BothGenerateDialogProps) {
  const [transporterId, setTransporterId] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [supplyType, setSupplyType] = useState('Outward');
  const [docType, setDocType] = useState('Tax Invoice');
  const [generateEinvoice, setGenerateEinvoice] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleGenerate = () => {
    if (!vehicleNo.trim()) return;
    setSaving(true);
    onGenerate({
      transporterId: transporterId || undefined,
      transporterName: transporterName || undefined,
      vehicleNo,
      distanceKm,
      supplyType,
      docType,
      generateEinvoice,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EwayIcon /> + <EinvoiceIcon /> E-Way Bill & e-Invoice
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Generate both E-Way Bill and e-Invoice in one step. Configure API credentials in Settings for real generation.
        </Alert>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Transporter ID / GSTIN" value={transporterId} onChange={(e) => setTransporterId(e.target.value)} size="small" />
          <TextField label="Transporter Name" value={transporterName} onChange={(e) => setTransporterName(e.target.value)} size="small" />
          <TextField label="Vehicle No *" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} size="small" required />
          <TextField label="Distance (KM)" type="number" value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))} size="small" />
          <TextField label="Supply Type" select value={supplyType} onChange={(e) => setSupplyType(e.target.value)} size="small">
            <MenuItem value="Outward">Outward</MenuItem>
            <MenuItem value="Inward">Inward</MenuItem>
          </TextField>
          <TextField label="Document Type" select value={docType} onChange={(e) => setDocType(e.target.value)} size="small">
            <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
            <MenuItem value="Bill of Supply">Bill of Supply</MenuItem>
            <MenuItem value="Delivery Challan">Delivery Challan</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Radio checked={generateEinvoice} onChange={(e) => setGenerateEinvoice(e.target.checked)} />}
            label="Also generate e-Invoice (IRN)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleGenerate} disabled={saving || !vehicleNo.trim()}>
          {saving ? <CircularProgress size={20} /> : 'Generate Both'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface InvoiceSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
}

function InvoiceSettingsDialog({ open, onClose, businessId }: InvoiceSettingsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [settings, setSettings] = useState({
    invoicePrefix: 'INV',
    startingNumber: 1001,
    defaultNotes: '',
    defaultTerms: '',
    bankName: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankBranch: '',
    upiId: '',
    showGstin: true,
    showBankDetails: true,
    showQrCode: false,
    signatureUrl: '',
    activeTemplate: 'classic',
    ewayBillApi: { clientId: '', clientSecret: '', username: '', password: '', environment: 'sandbox' as 'sandbox' | 'production' },
    einvoiceApi: { clientId: '', clientSecret: '', username: '', password: '', environment: 'sandbox' as 'sandbox' | 'production' },
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      invoicesApi.getSettings(businessId).then(({ data }) => data as unknown as Record<string, unknown>),
      invoicesApi.getTemplates(businessId).then(({ data }) => data as unknown as InvoiceTemplate[]).catch(() => []),
    ])
      .then(([d, tmpl]) => {
        setSettings({
          invoicePrefix: (d.invoicePrefix as string) || 'INV',
          startingNumber: (d.startingNumber as number) || 1001,
          defaultNotes: (d.defaultNotes as string) || '',
          defaultTerms: (d.defaultTerms as string) || '',
          bankName: (d.bankName as string) || '',
          bankAccountNo: (d.bankAccountNo as string) || '',
          bankIfsc: (d.bankIfsc as string) || '',
          bankBranch: (d.bankBranch as string) || '',
          upiId: (d.upiId as string) || '',
          showGstin: d.showGstin !== false,
          showBankDetails: d.showBankDetails !== false,
          showQrCode: d.showQrCode === true,
          signatureUrl: (d.signatureUrl as string) || '',
          activeTemplate: (d.activeTemplate as string) || 'classic',
          ewayBillApi: (d.ewayBillApi as any) || { clientId: '', clientSecret: '', username: '', password: '', environment: 'sandbox' },
          einvoiceApi: (d.einvoiceApi as any) || { clientId: '', clientSecret: '', username: '', password: '', environment: 'sandbox' },
        });
        setTemplates(tmpl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, businessId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await invoicesApi.updateSettings(businessId, settings);
      setSnackbar({ open: true, message: 'Settings saved', severity: 'success' });
      onClose();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save settings',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Invoice Settings
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          <>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
              <Tab label="General" />
              <Tab label="Templates" />
              <Tab label="E-Way Bill API" />
              <Tab label="e-Invoice API" />
            </Tabs>

            {tab === 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Numbering</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <TextField label="Invoice Prefix" value={settings.invoicePrefix} onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })} size="small" fullWidth />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField label="Starting Number" type="number" value={settings.startingNumber} onChange={(e) => setSettings({ ...settings, startingNumber: Number(e.target.value) })} size="small" fullWidth />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Defaults</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  <TextField label="Default Notes" value={settings.defaultNotes} onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })} multiline rows={2} size="small" fullWidth />
                  <TextField label="Default Terms" value={settings.defaultTerms} onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })} multiline rows={2} size="small" fullWidth />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Bank Details</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  <TextField label="Bank Name" value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} size="small" fullWidth />
                  <TextField label="Account No" value={settings.bankAccountNo} onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value })} size="small" fullWidth />
                  <Grid container spacing={2}>
                    <Grid item xs={6}><TextField label="IFSC" value={settings.bankIfsc} onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })} size="small" fullWidth /></Grid>
                    <Grid item xs={6}><TextField label="Branch" value={settings.bankBranch} onChange={(e) => setSettings({ ...settings, bankBranch: e.target.value })} size="small" fullWidth /></Grid>
                  </Grid>
                  <TextField label="UPI ID" value={settings.upiId} onChange={(e) => setSettings({ ...settings, upiId: e.target.value })} size="small" fullWidth />
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>Display Options</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <FormControlLabel control={<Radio checked={settings.showGstin} onChange={(e) => setSettings({ ...settings, showGstin: e.target.checked })} />} label="Show GSTIN" />
                  <FormControlLabel control={<Radio checked={settings.showBankDetails} onChange={(e) => setSettings({ ...settings, showBankDetails: e.target.checked })} />} label="Show Bank Details" />
                  <FormControlLabel control={<Radio checked={settings.showQrCode} onChange={(e) => setSettings({ ...settings, showQrCode: e.target.checked })} />} label="Show QR Code" />
                </Box>
              </>
            )}

            {tab === 1 && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choose a template for your invoice PDF and print layout
                </Typography>
                <Grid container spacing={2}>
                  {templates.map((tmpl) => (
                    <Grid item xs={12} sm={6} md={4} key={tmpl.id}>
                      <Paper
                        elevation={settings.activeTemplate === tmpl.id ? 3 : 1}
                        sx={{
                          p: 2, cursor: 'pointer', border: settings.activeTemplate === tmpl.id ? `2px solid ${tmpl.accentColor}` : '2px solid transparent',
                          transition: 'all 0.2s', '&:hover': { elevation: 2 },
                        }}
                        onClick={() => setSettings({ ...settings, activeTemplate: tmpl.id })}
                      >
                        <Box sx={{ height: 40, background: tmpl.headerStyle === 'gradient'
                          ? `linear-gradient(135deg, ${tmpl.accentColor}, ${tmpl.accentColor}cc)`
                          : tmpl.headerStyle === 'filled' ? tmpl.accentColor : 'transparent',
                          border: tmpl.headerStyle === 'bordered' ? `3px solid ${tmpl.accentColor}` : tmpl.headerStyle === 'underline' ? `none` : 'none',
                          borderBottom: tmpl.headerStyle === 'underline' ? `3px solid ${tmpl.accentColor}` : 'none',
                          borderRadius: '4px 4px 0 0', mb: 1, display: 'flex', alignItems: 'center', px: 1,
                        }}>
                          <Typography variant="caption" color={tmpl.headerStyle === 'filled' || tmpl.headerStyle === 'gradient' ? 'white' : tmpl.accentColor} fontWeight={700}>
                            {tmpl.name}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                          {[1, 2, 3].map((i) => (
                            <Box key={i} sx={{ flex: 1, height: 4, background: i === 1 ? tmpl.accentColor : '#e0e0e0', borderRadius: 1 }} />
                          ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {tmpl.description}
                        </Typography>
                        {settings.activeTemplate === tmpl.id && (
                          <Chip label="Active" size="small" sx={{ mt: 1, bgcolor: tmpl.accentColor, color: 'white' }} />
                        )}
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {tab === 2 && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Configure your E-Way Bill API credentials from the GSTN portal (ewaybillgst.gov.in).
                  If not configured, E-Way Bills will be generated in simulated mode.
                </Alert>
                <TextField label="Environment" select value={settings.ewayBillApi.environment} onChange={(e) => setSettings({ ...settings, ewayBillApi: { ...settings.ewayBillApi, environment: e.target.value as 'sandbox' | 'production' } })} size="small" fullWidth sx={{ mb: 2 }}>
                  <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
                  <MenuItem value="production">Production (Live)</MenuItem>
                </TextField>
                <TextField label="Client ID" value={settings.ewayBillApi.clientId} onChange={(e) => setSettings({ ...settings, ewayBillApi: { ...settings.ewayBillApi, clientId: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} />
                <TextField label="Client Secret" value={settings.ewayBillApi.clientSecret} onChange={(e) => setSettings({ ...settings, ewayBillApi: { ...settings.ewayBillApi, clientSecret: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} type="password" />
                <TextField label="Username (GSTIN)" value={settings.ewayBillApi.username} onChange={(e) => setSettings({ ...settings, ewayBillApi: { ...settings.ewayBillApi, username: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} />
                <TextField label="Password" value={settings.ewayBillApi.password} onChange={(e) => setSettings({ ...settings, ewayBillApi: { ...settings.ewayBillApi, password: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} type="password" />
              </>
            )}

            {tab === 3 && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Configure your e-Invoice API credentials from the GSTN portal (einvoice1.gst.gov.in).
                  If not configured, e-Invoices will be generated in simulated mode with placeholder IRN.
                </Alert>
                <TextField label="Environment" select value={settings.einvoiceApi.environment} onChange={(e) => setSettings({ ...settings, einvoiceApi: { ...settings.einvoiceApi, environment: e.target.value as 'sandbox' | 'production' } })} size="small" fullWidth sx={{ mb: 2 }}>
                  <MenuItem value="sandbox">Sandbox (Testing)</MenuItem>
                  <MenuItem value="production">Production (Live)</MenuItem>
                </TextField>
                <TextField label="Client ID" value={settings.einvoiceApi.clientId} onChange={(e) => setSettings({ ...settings, einvoiceApi: { ...settings.einvoiceApi, clientId: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} />
                <TextField label="Client Secret" value={settings.einvoiceApi.clientSecret} onChange={(e) => setSettings({ ...settings, einvoiceApi: { ...settings.einvoiceApi, clientSecret: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} type="password" />
                <TextField label="Username (GSTIN)" value={settings.einvoiceApi.username} onChange={(e) => setSettings({ ...settings, einvoiceApi: { ...settings.einvoiceApi, username: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} />
                <TextField label="Password" value={settings.einvoiceApi.password} onChange={(e) => setSettings({ ...settings, einvoiceApi: { ...settings.einvoiceApi, password: e.target.value } })} size="small" fullWidth sx={{ mb: 2 }} type="password" />
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

interface ActionMenuProps {
  invoice: Invoice;
  businessId: string;
  onView: (inv: Invoice) => void;
  onRefresh: () => void;
}

function ActionMenu({ invoice, businessId, onView, onRefresh }: ActionMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handlePrint = () => {
    setAnchorEl(null);
    invoicesApi.openPrint(businessId, invoice.id);
  };

  const handleDownload = async () => {
    setAnchorEl(null);
    try {
      const blob = await invoicesApi.downloadPdf(businessId, invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  return (
    <>
      <IconButton size="small" onClick={() => onView(invoice)}>
        <ViewIcon fontSize="small" />
      </IconButton>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreIcon fontSize="small" />
      </IconButton>

      <Dialog
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        maxWidth="xs"
        PaperProps={{ sx: { p: 1 } }}
      >
        <MenuItem onClick={() => { setAnchorEl(null); onView(invoice); }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); window.open(`/invoices/${invoice.id}/edit`, '_blank'); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={handlePrint}>
          <PrintIcon fontSize="small" sx={{ mr: 1 }} /> Print
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Download PDF
        </MenuItem>
      </Dialog>
    </>
  );
}

function InvoiceTab({ businessId, direction }: { businessId: string; direction: 'SALE' | 'PURCHASE' }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await invoicesApi.list(businessId, {
        search,
        direction,
        page: page + 1,
        limit: rowsPerPage,
      });
      setInvoices(data.data || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || `Failed to load ${direction.toLowerCase()} invoices`,
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, direction, search, page, rowsPerPage]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleViewDetail = async (inv: Invoice) => {
    try {
      const { data } = await invoicesApi.getById(businessId, inv.id);
      setSelectedInvoice(data);
    } catch {
      setSelectedInvoice(inv);
    }
    setDetailOpen(true);
  };

  const getPaymentLabel = (inv: Invoice) => {
    if (inv.paidAmount >= inv.grandTotal) return 'paid';
    if (inv.paidAmount > 0) return 'partial';
    return 'pending';
  };

  const getPaymentColor = (inv: Invoice): 'success' | 'warning' | 'default' => {
    if (inv.paidAmount >= inv.grandTotal) return 'success';
    if (inv.paidAmount > 0) return 'warning';
    return 'default';
  };

  const partyLabel = direction === 'SALE' ? 'Customer' : 'Supplier';

  const columns = [
    { id: 'invoiceNo', label: 'Invoice #', sortable: true, render: (r: Invoice) => r.invoiceNo },
    {
      id: 'partyName',
      label: partyLabel,
      sortable: true,
      render: (r: Invoice) => direction === 'SALE' ? (r.customer?.name || '-') : (r.supplier?.name || '-'),
    },
    { id: 'type', label: 'Type', render: (r: Invoice) => <Chip label={r.type} size="small" variant="outlined" /> },
    { id: 'invoiceDate', label: 'Date', sortable: true, render: (r: Invoice) => new Date(r.invoiceDate).toLocaleDateString('en-IN') },
    { id: 'grandTotal', label: 'Amount', sortable: true, render: (r: Invoice) => `₹${(r.grandTotal || 0).toLocaleString('en-IN')}` },
    {
      id: 'status',
      label: 'Status',
      render: (r: Invoice) => (
        <Chip label={r.status} size="small" color={statusColors[r.status] || 'default'} />
      ),
    },
    {
      id: 'paymentStatus',
      label: 'Payment',
      render: (r: Invoice) => (
        <Chip
          label={getPaymentLabel(r)}
          size="small"
          variant="outlined"
          color={getPaymentColor(r)}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Invoice) => (
        <ActionMenu invoice={r} businessId={businessId} onView={handleViewDetail} onRefresh={fetchInvoices} />
      ),
    },
  ];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ExportMenu
          headers={['Invoice #', partyLabel, 'Type', 'Date', 'Subtotal', 'Tax', 'Discount', 'Total', 'Paid', 'Balance', 'Status', 'Payment']}
          rows={invoices.map(inv => [
            inv.invoiceNo,
            direction === 'SALE' ? (inv.customer?.name || '-') : (inv.supplier?.name || '-'),
            inv.type,
            new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
            inv.subtotal || 0,
            inv.taxAmount || 0,
            inv.discount || 0,
            inv.grandTotal || 0,
            inv.paidAmount || 0,
            (inv.grandTotal || 0) - (inv.paidAmount || 0),
            inv.status,
            inv.paidAmount >= (inv.grandTotal || 0) ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Pending',
          ])}
          filename={`${direction.toLowerCase()}-invoices`}
          title={`${direction === 'SALE' ? 'Sales' : 'Purchase'} Invoices Report`}
          jsonData={invoices.map(inv => ({
            'Invoice #': inv.invoiceNo,
            [partyLabel]: direction === 'SALE' ? (inv.customer?.name || '-') : (inv.supplier?.name || '-'),
            Type: inv.type,
            Date: new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
            Subtotal: inv.subtotal || 0,
            Tax: inv.taxAmount || 0,
            Discount: inv.discount || 0,
            Total: inv.grandTotal || 0,
            Paid: inv.paidAmount || 0,
            Balance: (inv.grandTotal || 0) - (inv.paidAmount || 0),
            Status: inv.status,
            Payment: inv.paidAmount >= (inv.grandTotal || 0) ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Pending',
          }))}
          fetchAllData={async () => {
            const all = await fetchAllPages((params) => invoicesApi.list(businessId, { ...params, direction }));
            return {
              rows: all.map(inv => [
                inv.invoiceNo,
                direction === 'SALE' ? (inv.customer?.name || '-') : (inv.supplier?.name || '-'),
                inv.type,
                new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
                inv.subtotal || 0,
                inv.taxAmount || 0,
                inv.discount || 0,
                inv.grandTotal || 0,
                inv.paidAmount || 0,
                (inv.grandTotal || 0) - (inv.paidAmount || 0),
                inv.status,
                inv.paidAmount >= (inv.grandTotal || 0) ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Pending',
              ]),
              jsonData: all.map(inv => ({
                'Invoice #': inv.invoiceNo,
                [partyLabel]: direction === 'SALE' ? (inv.customer?.name || '-') : (inv.supplier?.name || '-'),
                Type: inv.type,
                Date: new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
                Subtotal: inv.subtotal || 0,
                Tax: inv.taxAmount || 0,
                Discount: inv.discount || 0,
                Total: inv.grandTotal || 0,
                Paid: inv.paidAmount || 0,
                Balance: (inv.grandTotal || 0) - (inv.paidAmount || 0),
                Status: inv.status,
                Payment: inv.paidAmount >= (inv.grandTotal || 0) ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Pending',
              })),
            };
          }}
        />
      </Box>

      <DataTable
        columns={columns}
        rows={invoices}
        loading={loading}
        searchable
        searchPlaceholder={`Search ${direction.toLowerCase()} invoices...`}
        onSearch={(q) => { setSearch(q); setPage(0); }}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
        emptyMessage={`No ${direction.toLowerCase()} invoices found.`}
      />

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {selectedInvoice && (
          <InvoiceDetailDialog
            open={detailOpen}
            onClose={() => setDetailOpen(false)}
            invoice={selectedInvoice}
            businessId={businessId}
            onRefresh={fetchInvoices}
          />
        )}
      </Dialog>
    </Box>
  );
}

export default function InvoicesPage() {
  const { currentBusinessId } = useBusiness();
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!currentBusinessId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Invoices</Typography>
        <Alert severity="info">Select a business from the top bar to view invoices</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Invoices</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsOpen(true)}
          >
            Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create Invoice
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Sale Invoices" />
          <Tab label="Purchase Invoices" />
        </Tabs>
      </Box>

      {tab === 0 && <InvoiceTab businessId={currentBusinessId} direction="SALE" />}
      {tab === 1 && <InvoiceTab businessId={currentBusinessId} direction="PURCHASE" />}

      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        businessId={currentBusinessId}
        direction={tab === 0 ? 'SALE' : 'PURCHASE'}
        onSaved={() => setCreateOpen(false)}
      />

      <InvoiceSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        businessId={currentBusinessId}
      />
    </Box>
  );
}
