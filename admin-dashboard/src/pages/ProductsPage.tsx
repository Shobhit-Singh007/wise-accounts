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
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import DataTable from '../components/DataTable';
import { productsApi, type Product, type ProductCreate } from '../api/products';
import { useBusiness } from '../context/BusinessContext';

const initialState: ProductCreate = {
  name: '',
  sku: '',
  hsnCode: '',
  unit: 'piece',
  sellingPrice: 0,
  purchasePrice: 0,
  taxRate: 18,
  lowStockThreshold: 10,
};

export default function ProductsPage() {
  const { currentBusinessId } = useBusiness();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductCreate>(initialState);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await productsApi.list(currentBusinessId, {
        search,
        page: page + 1,
        limit: rowsPerPage,
      });
      setProducts(data.data || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load products',
      );
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId, search, page, rowsPerPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialState);
    setDialogOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku || '',
      hsnCode: p.hsnCode,
      unit: p.unit,
      sellingPrice: p.sellingPrice,
      purchasePrice: p.purchasePrice || 0,
      taxRate: p.taxRate,
      lowStockThreshold: p.lowStockThreshold || 10,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentBusinessId) return;
    setSaving(true);
    try {
      if (editing) {
        await productsApi.update(currentBusinessId, editing.id, form);
      } else {
        await productsApi.create(currentBusinessId, form);
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save product',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { id: 'name', label: 'Product', sortable: true, render: (r: Product) => r.name },
    { id: 'sku', label: 'SKU', render: (r: Product) => r.sku || '-' },
    { id: 'hsnCode', label: 'HSN', render: (r: Product) => r.hsnCode },
    { id: 'sellingPrice', label: 'Price', sortable: true, render: (r: Product) => `₹${(r.sellingPrice || 0).toLocaleString('en-IN')}` },
    { id: 'taxRate', label: 'GST %', render: (r: Product) => `${r.taxRate}%` },
    {
      id: 'stock',
      label: 'Stock',
      sortable: true,
      render: (r: Product) => {
        const low = r.stock <= (r.lowStockThreshold || 0);
        return (
          <Chip
            label={`${r.stock} ${r.unit}`}
            size="small"
            color={r.stock === 0 ? 'error' : low ? 'warning' : 'success'}
            variant={low ? 'filled' : 'outlined'}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      render: (r: Product) => (
        <Chip label={r.isActive ? 'active' : 'inactive'} size="small" color={r.isActive ? 'success' : 'default'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Product) => (
        <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenEdit(r)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Product
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={products}
        loading={loading}
        searchable
        searchPlaceholder="Search products..."
        onSearch={(q) => { setSearch(q); setPage(0); }}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
        emptyMessage="No products found."
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="SKU" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="HSN Code" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} required />
            <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} required />
            <TextField label="Purchase Price" type="number" value={form.purchasePrice || 0} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            <TextField
              label="GST Rate"
              select
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <MenuItem key={r} value={r}>{r}%</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Unit"
              select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            >
              {['piece', 'kg', 'g', 'l', 'ml', 'm', 'box', 'pack'].map((u) => (
                <MenuItem key={u} value={u}>{u}</MenuItem>
              ))}
            </TextField>
            <TextField label="Low Stock Threshold" type="number" value={form.lowStockThreshold || 10} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
