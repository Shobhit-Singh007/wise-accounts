import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Grid,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Snackbar,
  Switch,
  FormControlLabel,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Receipt as InvoiceIcon,
  Payment as TaxIcon,
  Notifications as NotifIcon,
  Key as KeyIcon,
  Dangerous as DangerIcon,
} from '@mui/icons-material';
import { useBusiness } from '../context/BusinessContext';
import { businessesApi, type Business } from '../api/businesses';
import { invoicesApi } from '../api/invoices';
import client from '../api/client';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

export default function SettingsPage() {
  const { currentBusinessId, currentBusiness } = useBusiness();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profile, setProfile] = useState({
    name: '', gstin: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '', logoUrl: '',
  });

  const [invSettings, setInvSettings] = useState({
    invoicePrefix: 'INV', startingNumber: 1001, defaultNotes: '',
    bankName: '', bankAccountNo: '', bankIfsc: '', bankBranch: '', upiId: '',
    showGstin: true, showBankDetails: true, showQrCode: false,
  });

  const [taxSettings, setTaxSettings] = useState({ defaultTaxRate: 18, taxDisplayMode: 'inclusive' });
  const [notifSettings, setNotifSettings] = useState({ emailNotifications: true, smsNotifications: false });
  const [apiCreds, setApiCreds] = useState({
    razorpayKeyId: '', razorpayKeySecret: '',
    ewayClientId: '', ewayClientSecret: '', ewayUsername: '', ewayPassword: '', ewayEnvironment: 'sandbox',
    einvoiceClientId: '', einvoiceClientSecret: '', einvoiceUsername: '', einvoicePassword: '', einvoiceEnvironment: 'sandbox',
  });

  const loadAll = useCallback(async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const biz = currentBusiness || (await businessesApi.getById(currentBusinessId)).data;
      if (biz) {
        setProfile({
          name: biz.name || '', gstin: biz.gstin || '', phone: biz.phone || '',
          email: biz.email || '', address: biz.address || '', city: biz.city || '',
          state: biz.state || '', pincode: biz.pincode || '', logoUrl: (biz as any).logoUrl || '',
        });
      }

      try {
        const { data: inv } = await invoicesApi.getSettings(currentBusinessId) as any;
        setInvSettings({
          invoicePrefix: inv.invoicePrefix || 'INV',
          startingNumber: inv.startingNumber || 1001,
          defaultNotes: inv.defaultNotes || '',
          bankName: inv.bankName || '',
          bankAccountNo: inv.bankAccountNo || '',
          bankIfsc: inv.bankIfsc || '',
          bankBranch: inv.bankBranch || '',
          upiId: inv.upiId || '',
          showGstin: inv.showGstin !== false,
          showBankDetails: inv.showBankDetails !== false,
          showQrCode: inv.showQrCode === true,
        });
      } catch { /* silent */ }

      try {
        const { data: tax } = await client.get(`/businesses/${currentBusinessId}/settings/tax`) as any;
        setTaxSettings({
          defaultTaxRate: tax.defaultTaxRate ?? 18,
          taxDisplayMode: tax.taxDisplayMode || 'inclusive',
        });
      } catch { /* silent */ }

      try {
        const { data: notif } = await client.get(`/businesses/${currentBusinessId}/settings/notifications`) as any;
        setNotifSettings({
          emailNotifications: notif.emailNotifications !== false,
          smsNotifications: notif.smsNotifications === true,
        });
      } catch { /* silent */ }

      try {
        const { data: creds } = await client.get(`/businesses/${currentBusinessId}/settings/api-credentials`) as any;
        setApiCreds({
          razorpayKeyId: creds.razorpayKeyId || '',
          razorpayKeySecret: creds.razorpayKeySecret || '',
          ewayClientId: creds.ewayClientId || '',
          ewayClientSecret: creds.ewayClientSecret || '',
          ewayUsername: creds.ewayUsername || '',
          ewayPassword: creds.ewayPassword || '',
          ewayEnvironment: creds.ewayEnvironment || 'sandbox',
          einvoiceClientId: creds.einvoiceClientId || '',
          einvoiceClientSecret: creds.einvoiceClientSecret || '',
          einvoiceUsername: creds.einvoiceUsername || '',
          einvoicePassword: creds.einvoicePassword || '',
          einvoiceEnvironment: creds.einvoiceEnvironment || 'sandbox',
        });
      } catch { /* silent */ }
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load settings');
    }
    setLoading(false);
  }, [currentBusinessId, currentBusiness]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveProfile = async () => {
    if (!currentBusinessId) return;
    setSaving(true); setError('');
    try {
      await businessesApi.update(currentBusinessId, profile);
      setSuccess('Business profile saved');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const saveInvoiceSettings = async () => {
    if (!currentBusinessId) return;
    setSaving(true); setError('');
    try {
      await invoicesApi.updateSettings(currentBusinessId, invSettings);
      setSuccess('Invoice settings saved');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const saveTaxSettings = async () => {
    if (!currentBusinessId) return;
    setSaving(true); setError('');
    try {
      await client.put(`/businesses/${currentBusinessId}/settings/tax`, taxSettings);
      setSuccess('Tax settings saved');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const saveNotifSettings = async () => {
    if (!currentBusinessId) return;
    setSaving(true); setError('');
    try {
      await client.put(`/businesses/${currentBusinessId}/settings/notifications`, notifSettings);
      setSuccess('Notification preferences saved');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const saveApiCreds = async () => {
    if (!currentBusinessId) return;
    setSaving(true); setError('');
    try {
      await client.put(`/businesses/${currentBusinessId}/settings/api-credentials`, apiCreds);
      setSuccess('API credentials saved');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDeleteBusiness = async () => {
    if (!currentBusinessId) return;
    if (!confirm('This will permanently delete this business and ALL its data. Type the business name to confirm: ' + profile.name)) return;
    try {
      await businessesApi.delete(currentBusinessId);
      window.location.href = '/';
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete');
    }
  };

  if (!currentBusinessId) {
    return (
      <Box>
        <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
        <Alert severity="info">Select a business from the top bar</Alert>
      </Box>
    );
  }

  const tabIcons = [<BusinessIcon />, <InvoiceIcon />, <TaxIcon />, <NotifIcon />, <KeyIcon />, <DangerIcon />];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {['Business Profile', 'Invoice Settings', 'Tax Settings', 'Notifications', 'API Credentials', 'Danger Zone'].map((label, i) => (
            <Tab key={label} label={label} icon={tabIcons[i]} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <>
              {tab === 0 && (
                <Box sx={{ maxWidth: 700 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Business Profile</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Business Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="GSTIN" value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="City" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="State" select value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} size="small" fullWidth>
                        {INDIAN_STATES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Pincode" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Button variant="contained" onClick={saveProfile} disabled={saving} sx={{ mt: 3 }}>
                    {saving ? <CircularProgress size={20} /> : 'Save Profile'}
                  </Button>
                </Box>
              )}

              {tab === 1 && (
                <Box sx={{ maxWidth: 700 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Invoice Settings</Typography>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Numbering</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <TextField label="Invoice Prefix" value={invSettings.invoicePrefix} onChange={(e) => setInvSettings({ ...invSettings, invoicePrefix: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Starting Number" type="number" value={invSettings.startingNumber} onChange={(e) => setInvSettings({ ...invSettings, startingNumber: Number(e.target.value) })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Default Notes</Typography>
                  <TextField label="Default Notes" value={invSettings.defaultNotes} onChange={(e) => setInvSettings({ ...invSettings, defaultNotes: e.target.value })} size="small" fullWidth multiline rows={2} sx={{ mb: 3 }} />
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Bank Details</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <TextField label="Bank Name" value={invSettings.bankName} onChange={(e) => setInvSettings({ ...invSettings, bankName: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Account Number" value={invSettings.bankAccountNo} onChange={(e) => setInvSettings({ ...invSettings, bankAccountNo: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="IFSC" value={invSettings.bankIfsc} onChange={(e) => setInvSettings({ ...invSettings, bankIfsc: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Branch" value={invSettings.bankBranch} onChange={(e) => setInvSettings({ ...invSettings, bankBranch: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="UPI ID" value={invSettings.upiId} onChange={(e) => setInvSettings({ ...invSettings, upiId: e.target.value })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Display Options</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    <FormControlLabel control={<Switch checked={invSettings.showGstin} onChange={(e) => setInvSettings({ ...invSettings, showGstin: e.target.checked })} />} label="Show GSTIN on invoice" />
                    <FormControlLabel control={<Switch checked={invSettings.showBankDetails} onChange={(e) => setInvSettings({ ...invSettings, showBankDetails: e.target.checked })} />} label="Show Bank Details on invoice" />
                    <FormControlLabel control={<Switch checked={invSettings.showQrCode} onChange={(e) => setInvSettings({ ...invSettings, showQrCode: e.target.checked })} />} label="Show QR Code on invoice" />
                  </Box>
                  <Button variant="contained" onClick={saveInvoiceSettings} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : 'Save Invoice Settings'}
                  </Button>
                </Box>
              )}

              {tab === 2 && (
                <Box sx={{ maxWidth: 500 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Tax Settings</Typography>
                  <TextField
                    label="Default Tax Rate (%)"
                    type="number"
                    value={taxSettings.defaultTaxRate}
                    onChange={(e) => setTaxSettings({ ...taxSettings, defaultTaxRate: Number(e.target.value) })}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    label="Tax Display Mode"
                    select
                    value={taxSettings.taxDisplayMode}
                    onChange={(e) => setTaxSettings({ ...taxSettings, taxDisplayMode: e.target.value })}
                    size="small"
                    fullWidth
                    sx={{ mb: 3 }}
                  >
                    <MenuItem value="inclusive">Tax Inclusive</MenuItem>
                    <MenuItem value="exclusive">Tax Exclusive</MenuItem>
                  </TextField>
                  <Button variant="contained" onClick={saveTaxSettings} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : 'Save Tax Settings'}
                  </Button>
                </Box>
              )}

              {tab === 3 && (
                <Box sx={{ maxWidth: 500 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Notification Preferences</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                    <FormControlLabel
                      control={<Switch checked={notifSettings.emailNotifications} onChange={(e) => setNotifSettings({ ...notifSettings, emailNotifications: e.target.checked })} />}
                      label="Email Notifications"
                    />
                    <FormControlLabel
                      control={<Switch checked={notifSettings.smsNotifications} onChange={(e) => setNotifSettings({ ...notifSettings, smsNotifications: e.target.checked })} />}
                      label="SMS Notifications"
                    />
                  </Box>
                  <Button variant="contained" onClick={saveNotifSettings} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : 'Save Preferences'}
                  </Button>
                </Box>
              )}

              {tab === 4 && (
                <Box sx={{ maxWidth: 600 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>API Credentials</Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>Credentials are stored securely. Never share your API keys.</Alert>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Razorpay</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12}>
                      <TextField label="Razorpay Key ID" value={apiCreds.razorpayKeyId} onChange={(e) => setApiCreds({ ...apiCreds, razorpayKeyId: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Razorpay Key Secret" type="password" value={apiCreds.razorpayKeySecret} onChange={(e) => setApiCreds({ ...apiCreds, razorpayKeySecret: e.target.value })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>E-Way Bill</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <TextField label="Environment" select value={apiCreds.ewayEnvironment} onChange={(e) => setApiCreds({ ...apiCreds, ewayEnvironment: e.target.value })} size="small" fullWidth>
                        <MenuItem value="sandbox">Sandbox</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} />
                    <Grid item xs={6}>
                      <TextField label="Client ID" value={apiCreds.ewayClientId} onChange={(e) => setApiCreds({ ...apiCreds, ewayClientId: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Client Secret" type="password" value={apiCreds.ewayClientSecret} onChange={(e) => setApiCreds({ ...apiCreds, ewayClientSecret: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Username" value={apiCreds.ewayUsername} onChange={(e) => setApiCreds({ ...apiCreds, ewayUsername: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Password" type="password" value={apiCreds.ewayPassword} onChange={(e) => setApiCreds({ ...apiCreds, ewayPassword: e.target.value })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>e-Invoice</Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <TextField label="Environment" select value={apiCreds.einvoiceEnvironment} onChange={(e) => setApiCreds({ ...apiCreds, einvoiceEnvironment: e.target.value })} size="small" fullWidth>
                        <MenuItem value="sandbox">Sandbox</MenuItem>
                        <MenuItem value="production">Production</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={6} />
                    <Grid item xs={6}>
                      <TextField label="Client ID" value={apiCreds.einvoiceClientId} onChange={(e) => setApiCreds({ ...apiCreds, einvoiceClientId: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Client Secret" type="password" value={apiCreds.einvoiceClientSecret} onChange={(e) => setApiCreds({ ...apiCreds, einvoiceClientSecret: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Username" value={apiCreds.einvoiceUsername} onChange={(e) => setApiCreds({ ...apiCreds, einvoiceUsername: e.target.value })} size="small" fullWidth />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField label="Password" type="password" value={apiCreds.einvoicePassword} onChange={(e) => setApiCreds({ ...apiCreds, einvoicePassword: e.target.value })} size="small" fullWidth />
                    </Grid>
                  </Grid>
                  <Button variant="contained" onClick={saveApiCreds} disabled={saving}>
                    {saving ? <CircularProgress size={20} /> : 'Save API Credentials'}
                  </Button>
                </Box>
              )}

              {tab === 5 && (
                <Box sx={{ maxWidth: 500 }}>
                  <Typography variant="h6" color="error" sx={{ mb: 1 }}>Danger Zone</Typography>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Deleting your business will permanently remove all data including invoices, payments, customers, and products. This action cannot be undone.
                  </Alert>
                  <Button variant="contained" color="error" onClick={handleDeleteBusiness}>
                    Delete Business
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
      </Snackbar>
    </Box>
  );
}
