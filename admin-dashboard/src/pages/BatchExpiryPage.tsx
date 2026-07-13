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
} from '@mui/material';
import { useBusiness } from '../context/BusinessContext';
import client from '../api/client';

interface BatchExpiryItem {
  productId: string;
  productName: string;
  sku: string | null;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
  unit: string;
  warehouseName: string | null;
  status: 'expired' | 'expiring_soon' | 'valid';
  daysUntilExpiry: number | null;
}

const statusConfig: Record<string, { label: string; color: 'error' | 'warning' | 'success' }> = {
  expired: { label: 'Expired', color: 'error' },
  expiring_soon: { label: 'Expiring Soon', color: 'warning' },
  valid: { label: 'Valid', color: 'success' },
};

export default function BatchExpiryPage() {
  const { currentBusinessId } = useBusiness();
  const [items, setItems] = useState<BatchExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(0);

  const fetchBatches = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await client.get<{ data: BatchExpiryItem[] }>(
        `/businesses/${currentBusinessId}/expiring-batches`,
        { params: { filter: filter === 1 ? 'expiring_soon' : filter === 2 ? 'expired' : undefined } },
      );
      setItems(data.data || []);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to load batch/expiry data',
      );
    } finally {
      setLoading(false);
    }
  }, [currentBusinessId, filter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  if (!currentBusinessId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Batch & Expiry Management</Typography>
        <Alert severity="info">Select a business from the top bar</Alert>
      </Box>
    );
  }

  const filteredItems = filter === 0 ? items : items;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Batch & Expiry Management</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)}>
          <Tab label={`All (${items.length})`} />
          <Tab label={`Expiring Soon (${items.filter((i) => i.status === 'expiring_soon').length})`} />
          <Tab label={`Expired (${items.filter((i) => i.status === 'expired').length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Batch No</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Expiry Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Warehouse</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No batch/expiry data found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, idx) => (
                  <TableRow
                    key={`${item.productId}-${item.batchNo}-${idx}`}
                    sx={{
                      '&:nth-of-type(odd)': { bgcolor: 'action.hover' },
                      bgcolor: item.status === 'expired' ? 'rgba(211,47,47,0.04)' : undefined,
                    }}
                  >
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.sku || '-'}</TableCell>
                    <TableCell>{item.batchNo}</TableCell>
                    <TableCell>
                      {item.expiryDate
                        ? new Date(item.expiryDate).toLocaleDateString('en-IN')
                        : '-'}
                    </TableCell>
                    <TableCell align="right">{item.quantity} {item.unit}</TableCell>
                    <TableCell>{item.warehouseName || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[item.status]?.label || item.status}
                        size="small"
                        color={statusConfig[item.status]?.color || 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
