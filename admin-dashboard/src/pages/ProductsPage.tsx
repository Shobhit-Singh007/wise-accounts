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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Category as CategoryIcon, Inventory as InventoryIcon } from '@mui/icons-material';
import DataTable from '../components/DataTable';
import ExportMenu from '../components/ExportMenu';
import { productsApi, type Product, type ProductCreate } from '../api/products';
import { useBusiness } from '../context/BusinessContext';
import client from '../api/client';
import { generateBarcodeSvg } from '../utils/barcodeUtils';
import { fetchAllPages } from '../utils/exportUtils';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  productCount?: number;
}

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

function CategoriesDialog({ open, onClose, businessId }: { open: boolean; onClose: () => void; businessId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get<{ data: Category[] }>(`/businesses/${businessId}/categories`);
      setCategories(data.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    if (open) fetchCategories();
  }, [open, fetchCategories]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await client.put(`/businesses/${businessId}/categories/${editing.id}`, { name, description });
      } else {
        await client.post(`/businesses/${businessId}/categories`, { name, description });
      }
      setFormOpen(false);
      setEditing(null);
      setName('');
      setDescription('');
      fetchCategories();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await client.delete(`/businesses/${businessId}/categories/${cat.id}`);
      fetchCategories();
    } catch { /* silent */ }
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setFormOpen(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Manage Categories
        <Button startIcon={<AddIcon />} size="small" onClick={openCreate}>Add</Button>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : categories.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No categories yet</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.description || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(cat)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(cat)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} size="small" autoFocus />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} size="small" multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

function BarcodePopover({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const svg = generateBarcodeSvg(value, { width: 2, height: 50 });

  return (
    <>
      <Tooltip title="View barcode">
        <Chip
          label={value || '-'}
          size="small"
          variant="outlined"
          onClick={() => value && setOpen(true)}
          sx={{ cursor: value ? 'pointer' : 'default', fontFamily: 'monospace', fontSize: 11 }}
        />
      </Tooltip>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs">
        <DialogTitle>Barcode: {value}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [stockType, setStockType] = useState('PURCHASE');
  const [stockNotes, setStockNotes] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

  const handleDelete = async (product: Product) => {
    if (!currentBusinessId) return;
    if (!confirm(`Delete product "${product.name}"? This will deactivate it.`)) return;
    try {
      await productsApi.delete(currentBusinessId, product.id);
      fetchProducts();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleOpenStock = (product: Product) => {
    setStockProduct(product);
    setStockQuantity(0);
    setStockType('PURCHASE');
    setStockNotes('');
    setStockDialogOpen(true);
  };

  const handleStockAdjust = async () => {
    if (!currentBusinessId || !stockProduct || stockQuantity <= 0) return;
    setStockSaving(true);
    try {
      await client.post(`/businesses/${currentBusinessId}/products/${stockProduct.id}/stock-adjust`, {
        type: stockType,
        quantity: stockQuantity,
        notes: stockNotes || undefined,
      });
      setStockDialogOpen(false);
      fetchProducts();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setStockSaving(false);
    }
  };

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
      categoryId: p.categoryId || undefined,
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
    {
      id: 'barcode',
      label: 'Barcode',
      render: (r: Product) => <BarcodePopover value={r.sku || r.id.slice(0, 12)} />,
    },
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
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(r)} title="Edit"><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="info" onClick={() => handleOpenStock(r)} title="Adjust Stock"><InventoryIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => handleDelete(r)} title="Delete"><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentBusinessId && (
            <ExportMenu
              headers={['Name', 'SKU', 'HSN', 'Unit', 'Selling Price', 'Purchase Price', 'Tax Rate', 'Stock', 'Status']}
              rows={products.map(p => [p.name, p.sku || '', p.hsnCode, p.unit, p.sellingPrice, p.purchasePrice || 0, `${p.taxRate}%`, p.stock ?? 0, p.isActive ? 'Active' : 'Inactive'])}
              filename="products"
              title="Products Report"
              jsonData={products.map(p => ({ Name: p.name, SKU: p.sku || '', HSN: p.hsnCode, Unit: p.unit, 'Selling Price': p.sellingPrice, 'Purchase Price': p.purchasePrice || 0, 'Tax Rate': `${p.taxRate}%`, Stock: p.stock ?? 0, Status: p.isActive ? 'Active' : 'Inactive' }))}
              fetchAllData={async () => {
                const all = await fetchAllPages((params) => productsApi.list(currentBusinessId, params));
                return {
                  rows: all.map(p => [p.name, p.sku || '', p.hsnCode, p.unit, p.sellingPrice, p.purchasePrice || 0, `${p.taxRate}%`, p.stock ?? 0, p.isActive ? 'Active' : 'Inactive']),
                  jsonData: all.map(p => ({ Name: p.name, SKU: p.sku || '', HSN: p.hsnCode, Unit: p.unit, 'Selling Price': p.sellingPrice, 'Purchase Price': p.purchasePrice || 0, 'Tax Rate': `${p.taxRate}%`, Stock: p.stock ?? 0, Status: p.isActive ? 'Active' : 'Inactive' })),
                };
              }}
            />
          )}
          <Button variant="outlined" startIcon={<CategoryIcon />} onClick={() => setCategoriesOpen(true)}>
            Manage Categories
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Add Product
          </Button>
        </Box>
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
            <TextField label="SKU / Barcode" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
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

      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust Stock — {stockProduct?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Type"
              select
              value={stockType}
              onChange={(e) => setStockType(e.target.value)}
              size="small"
            >
              <MenuItem value="PURCHASE">Purchase (Add Stock)</MenuItem>
              <MenuItem value="SALE">Sale (Remove Stock)</MenuItem>
              <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
              <MenuItem value="RETURN">Return (Add Stock)</MenuItem>
            </TextField>
            <TextField
              label="Quantity"
              type="number"
              value={stockQuantity || ''}
              onChange={(e) => setStockQuantity(Math.max(0, Number(e.target.value)))}
              size="small"
              required
            />
            <TextField
              label="Notes"
              value={stockNotes}
              onChange={(e) => setStockNotes(e.target.value)}
              size="small"
              multiline
              rows={2}
            />
            {stockType === 'SALE' && (
              <Typography variant="caption" color="warning.main">Current stock: {stockProduct?.stock} {stockProduct?.unit}</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStockAdjust} disabled={stockSaving || stockQuantity <= 0}>
            {stockSaving ? <CircularProgress size={20} /> : 'Adjust'}
          </Button>
        </DialogActions>
      </Dialog>

      {currentBusinessId && (
        <CategoriesDialog
          open={categoriesOpen}
          onClose={() => setCategoriesOpen(false)}
          businessId={currentBusinessId}
        />
      )}
    </Box>
  );
}
