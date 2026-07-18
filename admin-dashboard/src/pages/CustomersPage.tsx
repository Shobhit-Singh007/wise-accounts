import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Receipt as ReceiptIcon, Search as SearchIcon } from '@mui/icons-material';
import DataTable from '../components/DataTable';
import ExportMenu from '../components/ExportMenu';
import { customersApi, type Customer, type CustomerCreate } from '../api/customers';
import client from '../api/client';
import { useBusiness } from '../context/BusinessContext';
import { fetchAllPages } from '../utils/exportUtils';

const initialState: CustomerCreate = {
  name: '',
  phone: '',
  email: '',
  gstin: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  creditLimit: 0,
};

export default function CustomersPage() {
  const { currentBusinessId } = useBusiness();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerCreate>(initialState);
  const [saving, setSaving] = useState(false);
  const [gstLookupLoading, setGstLookupLoading] = useState(false);

  const lookupGstin = async (gstin: string) => {
    if (!currentBusinessId || !gstin || gstin.length < 15) return;
    setGstLookupLoading(true);
    try {
      const { data } = await client.get(`/businesses/${currentBusinessId}/customers/gstin/${gstin}`);
      if (data && data.name) {
        setForm((prev) => ({
          ...prev,
          name: prev.name || data.tradeName || data.name || '',
          address: prev.address || data.address || '',
          city: prev.city || data.city || '',
          state: prev.state || data.state || '',
          pincode: prev.pincode || data.pincode || '',
          gstin: data.gstin || gstin,
        }));
      }
    } catch { /* silent */ }
    setGstLookupLoading(false);
  };

  const fetchCustomers = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await customersApi.list(currentBusinessId, {
        search,
        page: page + 1,
        limit: rowsPerPage,
      });
      setCustomers(data.data || []);
      setTotal(data.meta?.total ?? 0);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load customers',
      );
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId, search, page, rowsPerPage]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(initialState);
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      gstin: c.gstin || '',
      address: c.address || '',
      city: c.city,
      state: c.state,
      pincode: c.pincode,
      creditLimit: c.creditLimit,
    });
    setDialogOpen(true);
  };

  const handleViewLedger = (c: Customer) => {
    navigate(`/customers/${c.id}/ledger`);
  };

  const handleSave = async () => {
    if (!currentBusinessId) return;
    setSaving(true);
    try {
      if (editing) {
        await customersApi.update(currentBusinessId, editing.id, form);
      } else {
        await customersApi.create(currentBusinessId, form);
      }
      setDialogOpen(false);
      fetchCustomers();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to save customer',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { id: 'name', label: 'Name', sortable: true, render: (r: Customer) => r.name },
    { id: 'phone', label: 'Phone', render: (r: Customer) => r.phone },
    { id: 'gstin', label: 'GSTIN', render: (r: Customer) => r.gstin || '-' },
    { id: 'city', label: 'City', render: (r: Customer) => r.city },
    {
      id: 'balance',
      label: 'Outstanding',
      sortable: true,
      render: (r: Customer) => `₹${(r.balance || 0).toLocaleString('en-IN')}`,
    },
    {
      id: 'creditLimit',
      label: 'Credit Limit',
      sortable: true,
      render: (r: Customer) => `₹${(r.creditLimit || 0).toLocaleString('en-IN')}`,
    },
    {
      id: 'status',
      label: 'Status',
      render: (r: Customer) => (
        <Chip label={r.isActive ? 'active' : 'inactive'} size="small" color={r.isActive ? 'success' : 'default'} />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (r: Customer) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => handleOpenEdit(r)}>Edit</Button>
          <Button size="small" startIcon={<ReceiptIcon />} onClick={() => handleViewLedger(r)}>
            Ledger
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Customers</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentBusinessId && (
            <ExportMenu
              headers={['Name', 'Phone', 'Email', 'GSTIN', 'Address', 'City', 'State', 'Pincode', 'Balance', 'Credit Limit', 'Status']}
              rows={customers.map(c => [c.name, c.phone, c.email || '', c.gstin || '', c.address || '', c.city || '', c.state || '', c.pincode || '', c.balance || 0, c.creditLimit || 0, c.isActive ? 'Active' : 'Inactive'])}
              filename="customers"
              title="Customers Report"
              jsonData={customers.map(c => ({ Name: c.name, Phone: c.phone, Email: c.email || '', GSTIN: c.gstin || '', Address: c.address || '', City: c.city || '', State: c.state || '', Pincode: c.pincode || '', Balance: c.balance || 0, 'Credit Limit': c.creditLimit || 0, Status: c.isActive ? 'Active' : 'Inactive' }))}
              fetchAllData={async (signal) => {
                const all = await fetchAllPages((params) => customersApi.list(currentBusinessId, params));
                return {
                  rows: all.map(c => [c.name, c.phone, c.email || '', c.gstin || '', c.address || '', c.city || '', c.state || '', c.pincode || '', c.balance || 0, c.creditLimit || 0, c.isActive ? 'Active' : 'Inactive']),
                  jsonData: all.map(c => ({ Name: c.name, Phone: c.phone, Email: c.email || '', GSTIN: c.gstin || '', Address: c.address || '', City: c.city || '', State: c.state || '', Pincode: c.pincode || '', Balance: c.balance || 0, 'Credit Limit': c.creditLimit || 0, Status: c.isActive ? 'Active' : 'Inactive' })),
                };
              }}
            />
          )}
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Add Customer
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={customers}
        loading={loading}
        searchable
        searchPlaceholder="Search customers..."
        onSearch={(q) => { setSearch(q); setPage(0); }}
        total={total}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(0); }}
        emptyMessage="No customers found."
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <TextField label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField
              label="GSTIN"
              value={form.gstin || ''}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
              onBlur={(e) => { if (e.target.value.length === 15) lookupGstin(e.target.value); }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => lookupGstin(form.gstin || '')}
                      disabled={gstLookupLoading || !form.gstin || form.gstin.length < 15}
                    >
                      {gstLookupLoading ? <CircularProgress size={16} /> : <SearchIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField label="City" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <TextField label="State" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <TextField label="Pincode" value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <TextField label="Credit Limit" type="number" value={form.creditLimit || 0} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
            <TextField label="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth sx={{ gridColumn: '1 / -1' }} />
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
