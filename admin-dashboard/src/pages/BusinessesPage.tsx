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
import { businessesApi, type Business, type BusinessCreate } from '../api/businesses';

const initialState: BusinessCreate = {
  name: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Business | null>(null);
  const [form, setForm] = useState<BusinessCreate>(initialState);
  const [saving, setSaving] = useState(false);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await businessesApi.list({
        search,
        page: page + 1,
        limit: rowsPerPage,
      });
      const list = Array.isArray(data) ? data : (data as unknown as { data: Business[] }).data || [];
      setBusinesses(list);
      setTotal(list.length);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load businesses',
      );
    } finally {
      setLoading(false);
    }
  }, [search, page, rowsPerPage]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialState);
    setDialogOpen(true);
  };

  const handleOpenEdit = (biz: Business) => {
    setEditing(biz);
    setForm({
      name: biz.name,
      gstin: biz.gstin || '',
      phone: biz.phone || '',
      email: biz.email || '',
      address: biz.address || '',
      city: biz.city || '',
      state: biz.state || '',
      pincode: biz.pincode || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await businessesApi.update(editing.id, form);
      } else {
        await businessesApi.create(form);
      }
      setDialogOpen(false);
      fetchBusinesses();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save business',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { id: 'name', label: 'Name', sortable: true, render: (r: Business) => r.name },
    { id: 'gstin', label: 'GSTIN', sortable: true, render: (r: Business) => r.gstin || '-' },
    { id: 'phone', label: 'Phone', render: (r: Business) => r.phone },
    { id: 'city', label: 'City', render: (r: Business) => r.city },
    { id: 'state', label: 'State', render: (r: Business) => r.state },
    {
      id: 'status',
      label: 'Status',
      render: (r: Business) => (
        <Chip
          label={r.isActive ? 'active' : 'inactive'}
          size="small"
          color={r.isActive ? 'success' : 'default'}
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Business) => (
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => handleOpenEdit(r)}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Businesses</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Business
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={businesses}
        loading={loading}
        searchable
        searchPlaceholder="Search businesses..."
        onSearch={(q) => { setSearch(q); setPage(0); }}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
        emptyMessage="No businesses found. Click 'Add Business' to create one."
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Business' : 'Add Business'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Business Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
            <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth sx={{ gridColumn: '1 / -1' }} />
            <TextField label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
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
