import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  reportsApi,
  type SalesReport,
  type Gstr1Report,
  type Gstr3bReport,
} from '../api/reports';
import { useBusiness } from '../context/BusinessContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCurrentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function getMonthDateRange(month: number, year: number) {
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { fromDate, toDate };
}

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function MonthYearSelector({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (m: number, y: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Month</InputLabel>
        <Select
          value={month}
          label="Month"
          onChange={(e) => onChange(Number(e.target.value), year)}
        >
          {MONTHS.map((m, i) => (
            <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <InputLabel>Year</InputLabel>
        <Select
          value={year}
          label="Year"
          onChange={(e) => onChange(month, Number(e.target.value))}
        >
          {years.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}

function SalesTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { month, year } = getCurrentMonthYear();
  const { fromDate, toDate } = getMonthDateRange(month, year);

  useEffect(() => {
    reportsApi
      .sales(businessId, { startDate: fromDate, endDate: toDate })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load sales report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, fromDate, toDate]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No sales data</Alert>;

  const s = data.summary;

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Sales</Typography>
              <Typography variant="h5">₹{(s.totalSales || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total GST</Typography>
              <Typography variant="h5">₹{(s.totalTax || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Invoices</Typography>
              <Typography variant="h5">{s.totalInvoices}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Avg Invoice</Typography>
              <Typography variant="h5">₹{(s.averageInvoice || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.categorySales && data.categorySales.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Sales by Item</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.categorySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Sales']} />
              <Bar dataKey="total" fill="#1a237e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}

function Gstr1Tab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<Gstr1Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selMonth, setSelMonth] = useState(getCurrentMonthYear().month);
  const [selYear, setSelYear] = useState(getCurrentMonthYear().year);

  useEffect(() => {
    setLoading(true);
    const { fromDate, toDate } = getMonthDateRange(selMonth, selYear);
    reportsApi
      .gstr1(businessId, { fromDate, toDate })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load GSTR-1',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, selMonth, selYear]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No GSTR-1 data</Alert>;

  const totalTax = (data.summary?.totalTax || 0);

  return (
    <Box>
      <MonthYearSelector
        month={selMonth}
        year={selYear}
        onChange={(m, y) => { setSelMonth(m); setSelYear(y); }}
      />

      <Paper sx={{ p: 2, mb: 3, bgcolor: '#e8eaf6', borderLeft: '4px solid #1a237e' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          GSTR-1 for {MONTHS[selMonth - 1]} {selYear}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Period: {data.fromDate} to {data.toDate}
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
              <Typography variant="h5">{data.summary?.totalInvoices || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Taxable Value</Typography>
              <Typography variant="h5">₹{(data.summary?.totalTaxableValue || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Tax</Typography>
              <Typography variant="h5">₹{totalTax.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.b2b && data.b2b.length > 0 && (
        <Paper sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">B2B Invoices ({data.b2b.length})</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>GSTIN</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Taxable</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Tax</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.b2b.map((inv, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: '#fafafa' } }}>
                    <TableCell>{inv.invoiceNo}</TableCell>
                    <TableCell>{new Date(inv.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{inv.customerName}</TableCell>
                    <TableCell>{inv.customerGstin || '-'}</TableCell>
                    <TableCell align="right">₹{inv.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.taxAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.grandTotal.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {data.b2c && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>B2C Summary</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Invoices</Typography>
              <Typography variant="h6">{data.b2c.count}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Taxable Value</Typography>
              <Typography variant="h6">₹{(data.b2c.totalTaxableValue || 0).toLocaleString('en-IN')}</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">Tax</Typography>
              <Typography variant="h6">₹{(data.b2c.totalTax || 0).toLocaleString('en-IN')}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

function Gstr3bTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<Gstr3bReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selMonth, setSelMonth] = useState(getCurrentMonthYear().month);
  const [selYear, setSelYear] = useState(getCurrentMonthYear().year);

  useEffect(() => {
    setLoading(true);
    reportsApi
      .gstr3b(businessId, { month: selMonth, year: selYear })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load GSTR-3B',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, selMonth, selYear]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No GSTR-3B data</Alert>;

  const s = data.summary;

  return (
    <Box>
      <MonthYearSelector
        month={selMonth}
        year={selYear}
        onChange={(m, y) => { setSelMonth(m); setSelYear(y); }}
      />

      <Paper sx={{ p: 2, mb: 3, bgcolor: '#e8eaf6', borderLeft: '4px solid #1a237e' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          GSTR-3B for {MONTHS[selMonth - 1]} {selYear}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Outward Taxable Supplies</Typography>
              <Typography variant="h5">₹{(s.totalTaxableValue || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
              <Typography variant="h5">{s.totalInvoices || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Output Tax Liability</Typography>
              <Typography variant="h5" color="error">₹{(s.totalTax || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
              <Typography variant="h5" color="success.main">₹{(s.totalPaid || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: (s.outstanding || 0) > 0 ? '#ffebee' : '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Outstanding</Typography>
              <Typography variant="h5" color={(s.outstanding || 0) > 0 ? 'error' : 'success.main'}>
                ₹{(s.outstanding || 0).toLocaleString('en-IN')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function PnlTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<{
    revenue: number;
    totalSales: number;
    totalTax: number;
    totalDiscount: number;
    netProfit: number;
    invoiceCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi
      .pnl(businessId)
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load P&L',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No P&L data</Alert>;

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Revenue</Typography>
              <Typography variant="h5" color="success.main">₹{(data.revenue || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Tax</Typography>
              <Typography variant="h5">₹{(data.totalTax || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Discount</Typography>
              <Typography variant="h5">₹{(data.totalDiscount || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: (data.netProfit || 0) >= 0 ? '#e8f5e9' : '#ffebee' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Net Revenue</Typography>
              <Typography variant="h5" color={(data.netProfit || 0) >= 0 ? 'success.main' : 'error'}>
                ₹{(data.netProfit || 0).toLocaleString('en-IN')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
              <Typography variant="h5">{data.invoiceCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ReportsPage() {
  const { currentBusinessId } = useBusiness();
  const [tab, setTab] = useState(0);

  if (!currentBusinessId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Reports & GST Returns</Typography>
        <Alert severity="info">Select a business from the top bar to view reports</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Reports & GST Returns</Typography>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Sales Summary" />
          <Tab label="GSTR-1" />
          <Tab label="GSTR-3B" />
          <Tab label="Profit & Loss" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}><SalesTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={1}><Gstr1Tab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={2}><Gstr3bTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={3}><PnlTab businessId={currentBusinessId} /></TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
