import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Typography,
} from '@mui/material';
import {
  Business as BusinessIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../components/StatCard';
import { reportsApi, type DashboardStats } from '../api/reports';
import { useBusiness } from '../context/BusinessContext';

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
            title="Total Businesses"
            value={stats.totalBusinesses}
            icon={<BusinessIcon sx={{ color: 'primary.main' }} />}
            color="primary.main"
          />
        </Grid>
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
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={<ReceiptIcon sx={{ color: '#ff8f00' }} />}
            color="#ff8f00"
            subtitle={`${stats.pendingInvoices} pending, ${stats.overdueInvoices} overdue`}
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Monthly Sales Trend
        </Typography>
        {stats.monthlySales && stats.monthlySales.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
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
    </Box>
  );
}
