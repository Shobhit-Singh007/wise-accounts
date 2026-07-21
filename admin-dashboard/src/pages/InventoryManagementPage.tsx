import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useBusiness } from '../context/BusinessContext';
import client from '../api/client';
import { reportsApi } from '../api/reports';
import { warehousesApi, type Warehouse } from '../api/warehouses';
import { exportToCsv } from '../utils/exportUtils';
import type {
  InventoryDashboardReport,
  StockMovementItem,
  StockMovementsReport,
  InventoryCategory,
  InventorySupplier,
  InventoryPurchaseOrder,
} from '../api/reports';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function DateRangeSelector({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (s: string, e: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
      <FormControl size="small">
        <InputLabel shrink>From</InputLabel>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange(e.target.value, endDate)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </FormControl>
      <FormControl size="small">
        <InputLabel shrink>To</InputLabel>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange(startDate, e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </FormControl>
    </Box>
  );
}

const movementTypeConfig: Record<string, { label: string; color: 'success' | 'error' | 'info' | 'warning' | 'default' }> = {
  PURCHASE: { label: 'Purchase', color: 'success' },
  SALE: { label: 'Sale', color: 'error' },
  TRANSFER: { label: 'Transfer', color: 'info' },
  ADJUSTMENT: { label: 'Adjustment', color: 'warning' },
  RETURN: { label: 'Return', color: 'default' },
};

const poStatusConfig: Record<string, { label: string; color: 'success' | 'error' | 'info' | 'warning' | 'default' }> = {
  DRAFT: { label: 'Draft', color: 'default' },
  ORDERED: { label: 'Ordered', color: 'info' },
  PARTIALLY_RECEIVED: { label: 'Partial', color: 'warning' },
  RECEIVED: { label: 'Received', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'error' },
};

function DashboardTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<InventoryDashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi
      .inventoryDashboard(businessId)
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load inventory dashboard',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No inventory data</Alert>;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Products</Typography>
              <Typography variant="h5">{data.totalProducts}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Stock Value</Typography>
              <Typography variant="h5">₹{data.stockValue.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Retail Value</Typography>
              <Typography variant="h5">₹{data.retailValue.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Potential Profit</Typography>
              <Typography variant="h5" color="success.main">₹{data.potentialProfit.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card sx={{ bgcolor: data.lowStockCount > 0 ? '#fff3e0' : '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Low Stock</Typography>
              <Typography variant="h5" color={data.lowStockCount > 0 ? 'warning.main' : 'success.main'}>{data.lowStockCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card sx={{ bgcolor: data.outOfStockCount > 0 ? '#ffebee' : '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Out of Stock</Typography>
              <Typography variant="h5" color={data.outOfStockCount > 0 ? 'error' : 'success.main'}>{data.outOfStockCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.stockByWarehouse.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Stock by Warehouse</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.stockByWarehouse}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="warehouse" />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Value']} />
              <Bar dataKey="value" fill="#1a237e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {data.recentMovements.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Recent Stock Movements</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentMovements.slice(0, 10).map((m) => (
                  <TableRow key={m.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{new Date(m.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell>{m.warehouseName}</TableCell>
                    <TableCell>
                      <Chip label={movementTypeConfig[m.type]?.label || m.type} size="small" color={movementTypeConfig[m.type]?.color || 'default'} />
                    </TableCell>
                    <TableCell align="right">{m.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {data.lowStockAlerts.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Low Stock Alerts</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Current Stock</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Threshold</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.lowStockAlerts.map((a, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{a.productName}</TableCell>
                    <TableCell align="right">
                      <Typography color="error" fontWeight={600}>{a.currentStock}</Typography>
                    </TableCell>
                    <TableCell align="right">{a.threshold}</TableCell>
                    <TableCell>{a.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}

function StockMovementsTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<StockMovementsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [productId, setProductId] = useState('');

  const fetchMovements = useCallback(() => {
    setLoading(true);
    reportsApi
      .stockMovements(businessId, { startDate: startDate || undefined, endDate: endDate || undefined, productId: productId || undefined })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load stock movements',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, startDate, endDate, productId]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No stock movement data</Alert>;

  const csvHeaders = ['Date', 'Product', 'Warehouse', 'Type', 'Quantity', 'Batch', 'Notes'];
  const csvRows = data.movements.map((m) => [
    new Date(m.date).toLocaleDateString('en-IN'), m.productName, m.warehouseName,
    m.type, m.quantity, m.batchNo || '', m.notes || '',
  ]);

  return (
    <Box>
      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
      />
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size="small"
          label="Filter by Product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportToCsv(csvHeaders, csvRows, 'stock-movements')}>
          Export CSV
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Stock Movements ({data.movements.length})</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No stock movements found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.movements.map((m) => (
                  <TableRow key={m.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{new Date(m.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{m.productName}</TableCell>
                    <TableCell>{m.warehouseName}</TableCell>
                    <TableCell>
                      <Chip label={movementTypeConfig[m.type]?.label || m.type} size="small" color={movementTypeConfig[m.type]?.color || 'default'} />
                    </TableCell>
                    <TableCell align="right">{m.quantity}</TableCell>
                    <TableCell>{m.batchNo || '-'}</TableCell>
                    <TableCell>{m.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {data.monthlySummary.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Monthly Summary</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.monthlySummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="purchases" fill="#2e7d32" radius={[4, 4, 0, 0]} name="Purchases" />
              <Bar dataKey="sales" fill="#e53935" radius={[4, 4, 0, 0]} name="Sales" />
              <Bar dataKey="transfers" fill="#1a237e" radius={[4, 4, 0, 0]} name="Transfers" />
              <Bar dataKey="adjustments" fill="#ff8f00" radius={[4, 4, 0, 0]} name="Adjustments" />
              <Bar dataKey="returns" fill="#7b1fa2" radius={[4, 4, 0, 0]} name="Returns" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}

function CategoriesTab({ businessId }: { businessId: string }) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState('');

  const fetchCategories = useCallback(() => {
    setLoading(true);
    client
      .get<InventoryCategory[]>(`/businesses/${businessId}/categories`)
      .then(({ data: d }) => setCategories(Array.isArray(d) ? d : []))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load categories',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async () => {
    try {
      if (editingCategory) {
        await client.put(`/businesses/${businessId}/categories/${editingCategory.id}`, { name: formName, description: formDescription || null, parentId: formParentId || null });
      } else {
        await client.post(`/businesses/${businessId}/categories`, { name: formName, description: formDescription || null, parentId: formParentId || null });
      }
      setDialogOpen(false);
      setEditingCategory(null);
      setFormName('');
      setFormDescription('');
      setFormParentId('');
      fetchCategories();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save category',
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await client.delete(`/businesses/${businessId}/categories/${id}`);
      fetchCategories();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to delete category',
      );
    }
  };

  const openEdit = (cat: InventoryCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormParentId(cat.parentId || '');
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormParentId('');
    setDialogOpen(true);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Categories ({categories.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Category</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Products</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No categories found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.description || '-'}</TableCell>
                    <TableCell align="right">{cat.productCount}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(cat)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(cat.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Name" value={formName} onChange={(e) => setFormName(e.target.value)} fullWidth />
          <TextField label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} fullWidth multiline rows={2} />
          <FormControl fullWidth>
            <InputLabel>Parent Category</InputLabel>
            <Select value={formParentId} label="Parent Category" onChange={(e) => setFormParentId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {categories.filter((c) => c.id !== editingCategory?.id).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formName.trim()}>{editingCategory ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SuppliersTab({ businessId }: { businessId: string }) {
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InventorySupplier | null>(null);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', gstin: '' });

  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    client
      .get<InventorySupplier[]>(`/businesses/${businessId}/suppliers`)
      .then(({ data: d }) => setSuppliers(Array.isArray(d) ? d : []))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load suppliers',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSave = async () => {
    try {
      if (editingSupplier) {
        await client.put(`/businesses/${businessId}/suppliers/${editingSupplier.id}`, form);
      } else {
        await client.post(`/businesses/${businessId}/suppliers`, form);
      }
      setDialogOpen(false);
      setEditingSupplier(null);
      setForm({ name: '', contactName: '', phone: '', email: '', address: '', gstin: '' });
      fetchSuppliers();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save supplier',
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await client.delete(`/businesses/${businessId}/suppliers/${id}`);
      fetchSuppliers();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to delete supplier',
      );
    }
  };

  const openEdit = (s: InventorySupplier) => {
    setEditingSupplier(s);
    setForm({ name: s.name, contactName: s.contactName || '', phone: s.phone || '', email: s.email || '', address: s.address || '', gstin: s.gstin || '' });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setForm({ name: '', contactName: '', phone: '', email: '', address: '', gstin: '' });
    setDialogOpen(true);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Suppliers ({suppliers.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Supplier</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>GSTIN</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Active Orders</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No suppliers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((s) => (
                  <TableRow key={s.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.contactName || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell>{s.email || '-'}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.gstin || '-'}</TableCell>
                    <TableCell align="right">{s.activeOrders}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(s)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(s.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Create Supplier'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="Contact Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} fullWidth />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} fullWidth />
          <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} fullWidth />
          <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth multiline rows={2} />
          <TextField label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name.trim()}>{editingSupplier ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function PurchaseOrdersTab({ businessId }: { businessId: string }) {
  const [orders, setOrders] = useState<InventoryPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<InventoryPurchaseOrder | null>(null);
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '' });
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    client
      .get<InventoryPurchaseOrder[]>(`/businesses/${businessId}/purchase-orders`)
      .then(({ data: d }) => setOrders(Array.isArray(d) ? d : []))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load purchase orders',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    fetchOrders();
    client
      .get<InventorySupplier[]>(`/businesses/${businessId}/suppliers`)
      .then(({ data: d }) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [fetchOrders, businessId]);

  const handleSave = async () => {
    try {
      if (editingOrder) {
        await client.put(`/businesses/${businessId}/purchase-orders/${editingOrder.id}`, form);
      } else {
        await client.post(`/businesses/${businessId}/purchase-orders`, form);
      }
      setDialogOpen(false);
      setEditingOrder(null);
      setForm({ supplierId: '', expectedDate: '', notes: '' });
      fetchOrders();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save purchase order',
      );
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await client.post(`/businesses/${businessId}/purchase-orders/${id}/receive`);
      fetchOrders();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to receive order',
      );
    }
  };

  const openEdit = (o: InventoryPurchaseOrder) => {
    setEditingOrder(o);
    setForm({ supplierId: o.supplierId, expectedDate: o.expectedDate || '', notes: '' });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingOrder(null);
    setForm({ supplierId: '', expectedDate: '', notes: '' });
    setDialogOpen(true);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Purchase Orders ({orders.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Purchase Order</Button>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expected</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No purchase orders found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{o.orderNumber}</TableCell>
                    <TableCell>{o.supplierName}</TableCell>
                    <TableCell>{new Date(o.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('en-IN') : '-'}</TableCell>
                    <TableCell>
                      <Chip label={poStatusConfig[o.status]?.label || o.status} size="small" color={poStatusConfig[o.status]?.color || 'default'} />
                    </TableCell>
                    <TableCell align="right">₹{o.totalAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">{o.itemCount}</TableCell>
                    <TableCell>
                      {o.status !== 'RECEIVED' && o.status !== 'CANCELLED' && (
                        <Button size="small" color="success" onClick={() => handleReceive(o.id)}>Receive</Button>
                      )}
                      {(o.status === 'DRAFT' || o.status === 'ORDERED') && (
                        <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(o)}>Edit</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOrder ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <FormControl fullWidth>
            <InputLabel>Supplier</InputLabel>
            <Select value={form.supplierId} label="Supplier" onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Expected Date"
            type="date"
            value={form.expectedDate}
            onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.supplierId}>{editingOrder ? 'Update' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function WarehousesTab({ businessId }: { businessId: string }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '' });
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await warehousesApi.list(businessId); setWarehouses(Array.isArray(data) ? data : []); }
    catch { }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleOpenCreate = () => { setEditing(null); setForm({ name: '', address: '', city: '', state: '' }); setDialogOpen(true); };
  const handleOpenEdit = (w: Warehouse) => { setEditing(w); setForm({ name: w.name, address: w.address || '', city: w.city || '', state: w.state || '' }); setDialogOpen(true); };
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) await warehousesApi.update(businessId, editing.id, form);
      else await warehousesApi.create(businessId, form);
      setDialogOpen(false); fetch();
    } catch { }
    setSaving(false);
  };
  const handleDelete = async (w: Warehouse) => {
    if (!window.confirm(`Deactivate warehouse "${w.name}"?`)) return;
    try { await warehousesApi.delete(businessId, w.id); fetch(); } catch { }
  };

  if (loading) return <CircularProgress />;
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>Add Warehouse</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>City</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>State</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((w) => (
              <TableRow key={w.id}>
                <TableCell>{w.name}</TableCell>
                <TableCell>{w.address || '-'}</TableCell>
                <TableCell>{w.city || '-'}</TableCell>
                <TableCell>{w.state || '-'}</TableCell>
                <TableCell><Chip label={w.isActive ? 'Active' : 'Inactive'} size="small" color={w.isActive ? 'success' : 'default'} /></TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpenEdit(w)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(w)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editing ? 'Edit Warehouse' : 'Add Warehouse'}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
          <TextField label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <CircularProgress size={20} /> : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function InventoryManagementPage() {
  const { currentBusinessId } = useBusiness();
  const [tab, setTab] = useState(0);

  if (!currentBusinessId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Inventory Management</Typography>
        <Alert severity="info">Select a business from the top bar to view inventory</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Inventory Management</Typography>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Dashboard" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Stock Movements" icon={<ShippingIcon />} iconPosition="start" />
          <Tab label="Categories" icon={<CategoryIcon />} iconPosition="start" />
          <Tab label="Suppliers" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Purchase Orders" icon={<CartIcon />} iconPosition="start" />
          <Tab label="Warehouses" icon={<BusinessIcon />} iconPosition="start" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}><DashboardTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={1}><StockMovementsTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={2}><CategoriesTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={3}><SuppliersTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={4}><PurchaseOrdersTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={5}><WarehousesTab businessId={currentBusinessId} /></TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
