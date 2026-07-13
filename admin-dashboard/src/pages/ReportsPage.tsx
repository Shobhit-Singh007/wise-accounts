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
  Chip,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import {
  reportsApi,
  type SalesReport,
  type Gstr1Report,
  type Gstr3bReport,
  type HsnReport,
  type CustomerReportItem,
  type ProductReport,
  type OutstandingReport,
  type PaymentCollectionReport,
  type InventoryValuation,
} from '../api/reports';
import { useBusiness } from '../context/BusinessContext';
import { exportToCsv, exportToPdf } from '../utils/exportUtils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PIE_COLORS = ['#1a237e', '#ff8f00', '#2e7d32', '#e53935', '#7b1fa2', '#00838f'];

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

function ExportButtons({ title, headers, rows, filename }: { title: string; headers: string[]; rows: (string | number)[][]; filename: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportToCsv(headers, rows, filename)}>
        Export CSV
      </Button>
      <Button size="small" variant="outlined" startIcon={<PdfIcon />} onClick={() => exportToPdf(title, headers, rows, filename)}>
        Export PDF
      </Button>
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
  const csvHeaders = ['Item', 'Count', 'Total'];
  const csvRows = (data.categorySales || []).map((c) => [c.name, c.count, c.total]);

  return (
    <Box>
      <ExportButtons title="Sales Summary" headers={csvHeaders} rows={csvRows} filename="sales-summary" />
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

function CustomerReportTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<CustomerReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi
      .customers(businessId)
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load customer report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const totalBalance = data.reduce((s, c) => s + c.balance, 0);
  const totalCreditLimit = data.reduce((s, c) => s + c.creditLimit, 0);

  const csvHeaders = ['Customer', 'Phone', 'Credit Limit', 'Balance', 'Invoices', 'Payments'];
  const csvRows = data.map((c) => [c.name, c.phone, c.creditLimit, c.balance, c.totalInvoices, c.totalPayments]);

  return (
    <Box>
      <ExportButtons title="Customer Report" headers={csvHeaders} rows={csvRows} filename="customer-report" />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Customers</Typography>
              <Typography variant="h5">{data.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Outstanding</Typography>
              <Typography variant="h5" color="error">₹{totalBalance.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Credit Limit</Typography>
              <Typography variant="h5">₹{totalCreditLimit.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Customer Summary</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Credit Limit</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Balance</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Invoices</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Payments</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((c) => (
                <TableRow key={c.id} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell align="right">₹{c.creditLimit.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{c.balance.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">{c.totalInvoices}</TableCell>
                  <TableCell align="right">{c.totalPayments}</TableCell>
                  <TableCell>
                    {c.balance > 0 ? (
                      <Chip label="Outstanding" color="warning" size="small" />
                    ) : c.balance < 0 ? (
                      <Chip label="Advance" color="success" size="small" />
                    ) : (
                      <Chip label="Settled" color="default" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function ProductReportTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<ProductReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    reportsApi
      .products(businessId, { startDate: startDate || undefined, endDate: endDate || undefined })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load product report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, startDate, endDate]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No product data</Alert>;

  const csvHeaders = ['Product', 'Qty Sold', 'Revenue', 'Tax', 'Invoices'];
  const csvRows = data.products.map((p) => [p.name, p.totalQuantity, p.totalRevenue, p.totalTax, p.invoiceCount]);

  return (
    <Box>
      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
      />
      <ExportButtons title="Product Report" headers={csvHeaders} rows={csvRows} filename="product-report" />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Products Sold</Typography>
              <Typography variant="h5">{data.summary.totalProducts}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
              <Typography variant="h5">₹{data.summary.totalRevenue.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Quantity</Typography>
              <Typography variant="h5">{data.summary.totalQuantity}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Product Sales Summary</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Quantity Sold</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Revenue</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Tax</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Invoice Count</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.productId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell align="right">{p.totalQuantity}</TableCell>
                  <TableCell align="right">₹{p.totalRevenue.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{p.totalTax.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">{p.invoiceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {data.products.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Revenue by Product</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.products.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
              <Bar dataKey="totalRevenue" fill="#1a237e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}

function OutstandingReportTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<OutstandingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi
      .outstanding(businessId)
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load outstanding report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No outstanding data</Alert>;

  const csvHeaders = ['Customer', 'Phone', 'Invoiced', 'Paid', 'Outstanding', 'Overdue'];
  const csvRows = data.customers.map((c) => [c.customerName, c.phone, c.totalInvoiced, c.totalPaid, c.outstanding, c.overdueCount]);

  return (
    <Box>
      <ExportButtons title="Outstanding Report" headers={csvHeaders} rows={csvRows} filename="outstanding-report" />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Outstanding</Typography>
              <Typography variant="h5" color="error">₹{data.summary.totalOutstanding.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Customers with Dues</Typography>
              <Typography variant="h5">{data.summary.totalCustomers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ bgcolor: data.summary.overdueCount > 0 ? '#ffebee' : '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Overdue Customers</Typography>
              <Typography variant="h5" color={data.summary.overdueCount > 0 ? 'error' : 'success.main'}>
                {data.summary.overdueCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Outstanding by Customer</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Invoiced</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Paid</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Outstanding</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Overdue Invoices</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Oldest Due</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.customers.map((c) => (
                <TableRow key={c.customerId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                  <TableCell>{c.customerName}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell align="right">₹{c.totalInvoiced.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{c.totalPaid.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">
                    <Typography color="error" fontWeight={600}>
                      ₹{c.outstanding.toLocaleString('en-IN')}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {c.overdueCount > 0 ? (
                      <Chip label={c.overdueCount} color="error" size="small" />
                    ) : (
                      <Typography color="text.secondary">0</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.oldestDueDate
                      ? new Date(c.oldestDueDate).toLocaleDateString('en-IN')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function PaymentCollectionTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<PaymentCollectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    reportsApi
      .paymentCollection(businessId, { startDate: startDate || undefined, endDate: endDate || undefined })
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load payment collection report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, startDate, endDate]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No payment data</Alert>;

  const csvHeaders = ['Customer', 'Payments', 'Total Collected'];
  const csvRows = data.byCustomer.map((c) => [c.name, c.count, c.total]);

  return (
    <Box>
      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
      />
      <ExportButtons title="Payment Collection" headers={csvHeaders} rows={csvRows} filename="payment-collection" />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Collected</Typography>
              <Typography variant="h5" color="success.main">₹{data.summary.totalCollected.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Payments</Typography>
              <Typography variant="h5">{data.summary.totalPayments}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Avg Payment</Typography>
              <Typography variant="h5">₹{data.summary.avgPayment.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Collection by Method</Typography>
            {data.byMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.byMethod}
                    dataKey="total"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.byMethod.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">No data</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Daily Collection Trend</Typography>
            {data.byDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="total" stroke="#2e7d32" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">No data</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {data.byCustomer.length > 0 && (
        <Paper>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Top Paying Customers</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Payments</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Collected</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.byCustomer.slice(0, 10).map((c) => (
                  <TableRow key={c.name} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.count}</TableCell>
                    <TableCell align="right">₹{c.total.toLocaleString('en-IN')}</TableCell>
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

function InventoryValuationTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<InventoryValuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reportsApi
      .inventoryValuation(businessId)
      .then(({ data: d }) => setData(d))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load inventory valuation',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <Alert severity="info">No inventory data</Alert>;

  const csvHeaders = ['Product', 'SKU', 'Stock', 'Purchase Price', 'Selling Price', 'Stock Value', 'Status'];
  const csvRows = data.products.map((p) => [
    p.name, p.sku || '', p.totalStock, p.purchasePrice, p.sellingPrice, p.stockValue,
    p.isLowStock ? 'Low Stock' : p.isService ? 'Service' : 'In Stock',
  ]);

  return (
    <Box>
      <ExportButtons title="Inventory Valuation" headers={csvHeaders} rows={csvRows} filename="inventory-valuation" />
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Products</Typography>
              <Typography variant="h5">{data.summary.totalProducts}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Stock Value</Typography>
              <Typography variant="h5">₹{data.summary.totalStockValue.toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ bgcolor: data.summary.lowStockCount > 0 ? '#fff3e0' : '#e8f5e9' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Low Stock Items</Typography>
              <Typography variant="h5" color={data.summary.lowStockCount > 0 ? 'warning.main' : 'success.main'}>
                {data.summary.lowStockCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Inventory Valuation</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Stock</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Purchase Price</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Selling Price</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Stock Value</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.products.map((p) => (
                <TableRow key={p.productId} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.sku || '-'}</TableCell>
                  <TableCell align="right">{p.totalStock} {p.unit}</TableCell>
                  <TableCell align="right">₹{p.purchasePrice.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{p.sellingPrice.toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{p.stockValue.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    {p.isLowStock ? (
                      <Chip label="Low Stock" color="warning" size="small" />
                    ) : p.isService ? (
                      <Chip label="Service" color="info" size="small" />
                    ) : (
                      <Chip label="In Stock" color="success" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
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

  const s = data.summary || {};

  const b2bHeaders = ['GSTIN', 'Invoice No', 'Date', 'Invoice Value', 'Place of Supply', 'Reverse Charge', 'Taxable Value', 'CGST', 'SGST', 'IGST'];
  const b2bRows = (data.b2b || []).map((inv) => [
    inv.customerGstin || '-', inv.invoiceNo, new Date(inv.date).toLocaleDateString('en-IN'),
    inv.invoiceValue, inv.placeOfSupply, inv.reverseCharge ? 'Y' : 'N',
    inv.taxableValue, inv.cgst, inv.sgst, inv.igst,
  ]);

  const b2cLargeHeaders = ['Place of Supply', 'Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST'];
  const b2cLargeRows = (data.b2cLarge || []).map((r) => [
    r.placeOfSupply, `${r.rate}%`, r.taxableValue, r.cgst, r.sgst, r.igst,
  ]);

  const b2cSmallHeaders = ['Place of Supply', 'Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST'];
  const b2cSmallRows = (data.b2cSmall || []).map((r) => [
    r.placeOfSupply, `${r.rate}%`, r.taxableValue, r.cgst, r.sgst, r.igst,
  ]);

  const hsnHeaders = ['HSN Code', 'Description', 'UQC', 'Quantity', 'Total Value', 'Taxable Value', 'CGST', 'SGST', 'IGST'];
  const hsnRows = (data.hsnSummary || []).map((h) => [
    h.hsnCode, h.description, h.uqc, h.quantity, h.totalValue, h.taxableValue, h.cgst, h.sgst, h.igst,
  ]);

  const docsHeaders = ['Document Type', 'Count', 'Total Value'];
  const docsRows = [
    ['Invoices Issued', data.documents?.invoicesIssued?.count || 0, data.documents?.invoicesIssued?.totalValue || 0],
    ['Credit Notes', data.documents?.creditNotes?.count || 0, data.documents?.creditNotes?.totalValue || 0],
  ];

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
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
              <Typography variant="h6">{s.totalInvoices || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Taxable</Typography>
              <Typography variant="h6">₹{(s.totalTaxableValue || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">CGST</Typography>
              <Typography variant="h6">₹{(s.totalCgst || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">SGST</Typography>
              <Typography variant="h6">₹{(s.totalSgst || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">IGST</Typography>
              <Typography variant="h6">₹{(s.totalIgst || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={2}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Cess</Typography>
              <Typography variant="h6">₹{(s.totalCess || 0).toLocaleString('en-IN')}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 4: B2B Invoices ({(data.b2b || []).length})</Typography>
        </Box>
        <ExportButtons title={`GSTR-1 B2B ${MONTHS[selMonth - 1]} ${selYear}`} headers={b2bHeaders} rows={b2bRows} filename={`gstr1-b2b-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {b2bHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: ['Taxable Value', 'CGST', 'SGST', 'IGST', 'Invoice Value'].includes(h) ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.b2b || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={b2bHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No B2B invoices</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.b2b!.map((inv, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{inv.customerGstin || '-'}</TableCell>
                    <TableCell>{inv.invoiceNo}</TableCell>
                    <TableCell>{new Date(inv.date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.invoiceValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell>{inv.placeOfSupply}</TableCell>
                    <TableCell>{inv.reverseCharge ? 'Y' : 'N'}</TableCell>
                    <TableCell align="right">₹{inv.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{inv.igst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 5: B2C Large ({(data.b2cLarge || []).length})</Typography>
        </Box>
        <ExportButtons title={`GSTR-1 B2C Large ${MONTHS[selMonth - 1]} ${selYear}`} headers={b2cLargeHeaders} rows={b2cLargeRows} filename={`gstr1-b2c-large-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {b2cLargeHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: ['Taxable Value', 'CGST', 'SGST', 'IGST'].includes(h) ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.b2cLarge || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={b2cLargeHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No B2C Large entries</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.b2cLarge!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.placeOfSupply}</TableCell>
                    <TableCell>{r.rate}%</TableCell>
                    <TableCell align="right">₹{r.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 6: B2C Small ({(data.b2cSmall || []).length})</Typography>
        </Box>
        <ExportButtons title={`GSTR-1 B2C Small ${MONTHS[selMonth - 1]} ${selYear}`} headers={b2cSmallHeaders} rows={b2cSmallRows} filename={`gstr1-b2c-small-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {b2cSmallHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: ['Taxable Value', 'CGST', 'SGST', 'IGST'].includes(h) ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.b2cSmall || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={b2cSmallHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No B2C Small entries</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.b2cSmall!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.placeOfSupply}</TableCell>
                    <TableCell>{r.rate}%</TableCell>
                    <TableCell align="right">₹{r.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 7: HSN Summary ({(data.hsnSummary || []).length})</Typography>
        </Box>
        <ExportButtons title={`GSTR-1 HSN Summary ${MONTHS[selMonth - 1]} ${selYear}`} headers={hsnHeaders} rows={hsnRows} filename={`gstr1-hsn-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {hsnHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: ['Quantity', 'Total Value', 'Taxable Value', 'CGST', 'SGST', 'IGST'].includes(h) ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.hsnSummary || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hsnHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No HSN data</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.hsnSummary!.map((h, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{h.hsnCode}</TableCell>
                    <TableCell>{h.description}</TableCell>
                    <TableCell>{h.uqc}</TableCell>
                    <TableCell align="right">{h.quantity}</TableCell>
                    <TableCell align="right">₹{h.totalValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.igst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 8: Documents</Typography>
        </Box>
        <ExportButtons title={`GSTR-1 Documents ${MONTHS[selMonth - 1]} ${selYear}`} headers={docsHeaders} rows={docsRows} filename={`gstr1-docs-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>Document Type</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Count</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Total Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                <TableCell>Invoices Issued</TableCell>
                <TableCell align="right">{data.documents?.invoicesIssued?.count || 0}</TableCell>
                <TableCell align="right">₹{(data.documents?.invoicesIssued?.totalValue || 0).toLocaleString('en-IN')}</TableCell>
              </TableRow>
              <TableRow sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                <TableCell>Credit Notes</TableCell>
                <TableCell align="right">{data.documents?.creditNotes?.count || 0}</TableCell>
                <TableCell align="right">₹{(data.documents?.creditNotes?.totalValue || 0).toLocaleString('en-IN')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
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

  const outwardHeaders = ['Description', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Cess'];
  const outwardRows = (data.outwardSupplies || []).map((r) => [
    r.label, r.taxableValue, r.igst, r.cgst, r.sgst, r.cess,
  ]);

  const interStateHeaders = ['Place of Supply', 'Taxable Value', 'IGST'];
  const interStateRows = (data.interStateSupplies || []).map((r) => [
    r.placeOfSupply, r.taxableValue, r.igst,
  ]);

  const itcHeaders = ['Category', 'IGST', 'CGST', 'SGST', 'Cess'];
  const itcRows = (data.eligibleItc || []).map((r) => [
    r.label, r.igst, r.cgst, r.sgst, r.cess,
  ]);

  const exemptHeaders = ['Description', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Cess'];
  const exemptRows = (data.exemptNilNonGst || []).map((r) => [
    r.label, r.taxableValue, r.igst, r.cgst, r.sgst, r.cess,
  ]);

  const paymentHeaders = ['Description', 'CGST', 'SGST', 'IGST', 'Cess', 'Interest', 'Late Fee', 'Total'];
  const paymentRows = (data.paymentOfTax || []).map((r) => [
    r.label, r.cgst, r.sgst, r.igst, r.cess, r.interest, r.lateFee, r.total,
  ]);

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

      <Grid container spacing={3} sx={{ mb: 3 }}>
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

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 3.1: Outward Supplies</Typography>
        </Box>
        <ExportButtons title={`GSTR-3B Outward Supplies ${MONTHS[selMonth - 1]} ${selYear}`} headers={outwardHeaders} rows={outwardRows} filename={`gstr3b-3-1-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {outwardHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: h !== 'Description' ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.outwardSupplies || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={outwardHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No data available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.outwardSupplies!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell align="right">₹{r.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cess.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 3.2: Inter-state Supplies to Unregistered Persons</Typography>
        </Box>
        <ExportButtons title={`GSTR-3B Inter-state ${MONTHS[selMonth - 1]} ${selYear}`} headers={interStateHeaders} rows={interStateRows} filename={`gstr3b-3-2-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {interStateHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: h !== 'Place of Supply' ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.interStateSupplies || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={interStateHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No inter-state supplies</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.interStateSupplies!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.placeOfSupply}</TableCell>
                    <TableCell align="right">₹{r.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 4: Eligible ITC</Typography>
        </Box>
        <ExportButtons title={`GSTR-3B ITC ${MONTHS[selMonth - 1]} ${selYear}`} headers={itcHeaders} rows={itcRows} filename={`gstr3b-4-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {itcHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: h !== 'Category' ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.eligibleItc || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={itcHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No ITC data</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.eligibleItc!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cess.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 5: Exempt, Nil-rated & Non-GST Supplies</Typography>
        </Box>
        <ExportButtons title={`GSTR-3B Exempt ${MONTHS[selMonth - 1]} ${selYear}`} headers={exemptHeaders} rows={exemptRows} filename={`gstr3b-5-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {exemptHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: h !== 'Description' ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.exemptNilNonGst || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={exemptHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No exempt/nil/non-GST data</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.exemptNilNonGst!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell align="right">₹{r.taxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cess.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Table 6: Payment of Tax</Typography>
        </Box>
        <ExportButtons title={`GSTR-3B Payment ${MONTHS[selMonth - 1]} ${selYear}`} headers={paymentHeaders} rows={paymentRows} filename={`gstr3b-6-${selMonth}-${selYear}`} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                {paymentHeaders.map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 600, textAlign: h !== 'Description' ? 'right' : 'left' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data.paymentOfTax || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={paymentHeaders.length} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No payment data</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.paymentOfTax!.map((r, idx) => (
                  <TableRow key={idx} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell align="right">₹{r.cgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.sgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.igst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.cess.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.interest.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{r.lateFee.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>₹{r.total.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
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
      <ExportButtons
        title="Profit & Loss"
        headers={['Metric', 'Value']}
        rows={[
          ['Revenue', data.revenue || 0],
          ['Total Tax', data.totalTax || 0],
          ['Discount', data.totalDiscount || 0],
          ['Net Revenue', data.netProfit || 0],
          ['Invoices', data.invoiceCount || 0],
        ]}
        filename="profit-loss"
      />
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

function HsnTab({ businessId }: { businessId: string }) {
  const [data, setData] = useState<HsnReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setLoading(true);
    reportsApi
      .hsn(businessId, { fromDate: startDate || undefined, toDate: endDate || undefined })
      .then(({ data: d }) => setData(d.items || []))
      .catch((err: unknown) =>
        setError(
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Failed to load HSN report',
        ),
      )
      .finally(() => setLoading(false));
  }, [businessId, startDate, endDate]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const csvHeaders = ['HSN Code', 'Description', 'UOM', 'Quantity', 'Value', 'Taxable', 'CGST', 'SGST', 'IGST'];
  const csvRows = data.map((h) => [
    h.hsnCode, h.description, h.uom, h.totalQuantity, h.totalValue,
    h.totalTaxableValue, h.totalCgst, h.totalSgst, h.totalIgst,
  ]);

  return (
    <Box>
      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
      />
      <ExportButtons title="HSN Summary" headers={csvHeaders} rows={csvRows} filename="hsn-summary" />

      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">HSN Summary</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600 }}>HSN Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>UOM</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Quantity</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Taxable Value</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>CGST</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>SGST</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>IGST</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No HSN data available</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((h) => (
                  <TableRow key={h.hsnCode} sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{h.hsnCode}</TableCell>
                    <TableCell>{h.description}</TableCell>
                    <TableCell>{h.uom}</TableCell>
                    <TableCell align="right">{h.totalQuantity}</TableCell>
                    <TableCell align="right">₹{h.totalTaxableValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.totalCgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.totalSgst.toLocaleString('en-IN')}</TableCell>
                    <TableCell align="right">₹{h.totalIgst.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
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
          <Tab label="HSN Summary" />
          <Tab label="Profit & Loss" />
          <Tab label="Customers" />
          <Tab label="Products" />
          <Tab label="Outstanding" />
          <Tab label="Payments" />
          <Tab label="Inventory" />
        </Tabs>
        <Divider />
        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}><SalesTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={1}><Gstr1Tab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={2}><Gstr3bTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={3}><HsnTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={4}><PnlTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={5}><CustomerReportTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={6}><ProductReportTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={7}><OutstandingReportTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={8}><PaymentCollectionTab businessId={currentBusinessId} /></TabPanel>
          <TabPanel value={tab} index={9}><InventoryValuationTab businessId={currentBusinessId} /></TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
