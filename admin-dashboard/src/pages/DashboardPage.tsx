import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import { reportsApi, type DashboardStats } from '../api/reports';
import { useBusiness } from '../context/BusinessContext';

const PIE_COLORS = ['#1a237e', '#ff8f00', '#2e7d32', '#e53935', '#7b1fa2', '#00838f'];

export default function DashboardPage() {
  const { currentBusinessId, loading: bizLoading } = useBusiness();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentBusinessId) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        const { data } = await reportsApi.dashboard(currentBusinessId);
        setStats(data);
      } catch (err: unknown) {
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load dashboard stats',
        );
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [currentBusinessId]);

  if (loading || bizLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!currentBusinessId) {
    return <Alert severity="info">Select a business from the top bar to view dashboard</Alert>;
  }

  if (!stats) {
    return (
      <Alert severity="info">No dashboard data available</Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={<PeopleIcon sx={{ color: '#2e7d32' }} />}
            color="#2e7d32"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={stats.totalProducts}
            icon={<InventoryIcon sx={{ color: '#7b1fa2' }} />}
            color="#7b1fa2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={<ReceiptIcon sx={{ color: '#ff8f00' }} />}
            color="#ff8f00"
            subtitle={`${stats.pendingInvoices || 0} pending, ${stats.overdueInvoices || 0} overdue`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`}
            icon={<PaymentsIcon sx={{ color: '#e53935' }} />}
            color="#e53935"
          />
        </Grid>
      </Grid>

      {stats.outstanding > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff3e0', borderLeft: '4px solid #ff8f00' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon sx={{ color: '#ff8f00' }} />
            <Typography variant="subtitle1" fontWeight={600}>
              Outstanding: ₹{stats.outstanding.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              from ₹{stats.totalBilled.toLocaleString('en-IN')} total billed
            </Typography>
          </Box>
        </Paper>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Monthly Sales Trend
            </Typography>
            {stats.monthlySales && stats.monthlySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `₹${value.toLocaleString('en-IN')}`,
                      'Sales',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#1a237e"
                    strokeWidth={2}
                    dot={{ fill: '#1a237e', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No sales data available yet
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Payment Methods
            </Typography>
            {stats.paymentMethodBreakdown && stats.paymentMethodBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.paymentMethodBreakdown}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {stats.paymentMethodBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No payment data yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top Customers
            </Typography>
            {stats.topCustomers && stats.topCustomers.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="total" fill="#2e7d32" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No customer data yet
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top Products
            </Typography>
            {stats.topProducts && stats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="revenue" fill="#ff8f00" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No product data yet
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
