import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Visibility, VisibilityOff, Phone, Mail, Lock, Smartphone } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithOtp, sendOtp } = useAuth();
  const [tab, setTab] = useState(0);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'input' | 'otp' | 'done'>('input');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { forgotPassword, resetPassword } = useAuth();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const isEmail = tab === 1;
    const identifier = isEmail ? email : phone;
    if (!identifier || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(identifier, password);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    if (!phone) { setError('Enter your phone number'); return; }
    setOtpLoading(true);
    try {
      await sendOtp(phone);
      setOtpSent(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to send OTP';
      setError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone || !otp) { setError('Enter phone and OTP'); return; }
    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Verification failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0d1b4a 0%, #1a237e 30%, #283593 60%, #3949ab 100%)',
        p: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
        <Button
          href="/"
          sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'none', '&:hover': { color: 'white' } }}
        >
          ← Back to Website
        </Button>
      </Box>
      <Card sx={{ maxWidth: 440, width: '100%', borderRadius: 3, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <Box component="img" src="/logo.svg" alt="Wise Accounts" sx={{ height: 36 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Sign in to your account to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setOtpSent(false); setOtp(''); setError(''); }} variant="fullWidth" sx={{ mb: 2 }}>
            <Tab icon={<Phone fontSize="small" />} label="Phone" />
            <Tab icon={<Mail fontSize="small" />} label="Email" />
            <Tab icon={<Smartphone fontSize="small" />} label="OTP" />
          </Tabs>

          {tab === 0 && (
            <form onSubmit={handlePasswordLogin}>
              <TextField fullWidth label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" margin="normal" InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }} />
              <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" margin="normal" InputProps={{ startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.5, borderRadius: 2, fontSize: '1rem', bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>{loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}</Button>
            </form>
          )}

          {tab === 1 && (
            <form onSubmit={handlePasswordLogin}>
              <TextField fullWidth label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" margin="normal" type="email" InputProps={{ startAdornment: <InputAdornment position="start"><Mail color="action" /></InputAdornment> }} />
              <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" margin="normal" InputProps={{ startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} />
              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 3, py: 1.5, borderRadius: 2, fontSize: '1rem', bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>{loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}</Button>
            </form>
          )}

          {tab === 2 && (
            <form onSubmit={handleOtpLogin}>
              <TextField fullWidth label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" margin="normal" InputProps={{ startAdornment: <InputAdornment position="start"><Smartphone color="action" /></InputAdornment> }} />
              {!otpSent ? (
                <Button onClick={handleSendOtp} fullWidth variant="contained" size="large" disabled={otpLoading || !phone} sx={{ mt: 2, py: 1.5, borderRadius: 2, bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>{otpLoading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}</Button>
              ) : (
                <>
                  <TextField fullWidth label="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" margin="normal" inputProps={{ maxLength: 6 }} InputProps={{ startAdornment: <InputAdornment position="start"><Lock color="action" /></InputAdornment> }} />
                  <Button type="submit" fullWidth variant="contained" size="large" disabled={loading || otp.length < 6} sx={{ mt: 2, py: 1.5, borderRadius: 2, bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}>{loading ? <CircularProgress size={24} color="inherit" /> : 'Verify & Login'}</Button>
                  <Button onClick={() => { setOtpSent(false); setOtp(''); }} fullWidth size="small" sx={{ mt: 1 }}>Change phone number</Button>
                </>
              )}
            </form>
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
            <Button size="small" onClick={() => setForgotOpen(true)} sx={{ textTransform: 'none', color: '#1a237e' }}>
              Forgot Password?
            </Button>
          </Typography>

          <Typography variant="body2" color="text.secondary" align="center">
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ fontWeight: 600, color: '#1a237e', textDecoration: 'none' }}
            >
              Create one here
            </Link>
          </Typography>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reset Password</DialogTitle>
        <DialogContent>
          {forgotStep === 'done' ? (
            <Alert severity="success" sx={{ mt: 1 }}>{forgotMsg}</Alert>
          ) : forgotStep === 'otp' ? (
            <>
              <TextField fullWidth label="Enter OTP" value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} placeholder="6-digit OTP" margin="normal" inputProps={{ maxLength: 6 }} />
              <TextField fullWidth label="New Password" type="password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} placeholder="Min 8 characters" margin="normal" />
              <Button fullWidth variant="contained" disabled={forgotLoading || forgotOtp.length < 6 || forgotNewPassword.length < 8} onClick={async () => {
                setForgotLoading(true); setForgotMsg('');
                try {
                  await resetPassword(forgotPhone || forgotEmail, forgotOtp, forgotNewPassword);
                  setForgotMsg('Password reset successfully!');
                  setForgotStep('done');
                } catch (err: any) { setForgotMsg(err?.response?.data?.message || 'Failed'); }
                setForgotLoading(false);
              }} sx={{ mt: 2, py: 1.5 }}>
                {forgotLoading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </>
          ) : (
            <>
              <TextField fullWidth label="Phone Number" value={forgotPhone} onChange={(e) => setForgotPhone(e.target.value)} placeholder="Registered phone" margin="normal" />
              <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 1 }}>OR</Typography>
              <TextField fullWidth label="Email Address" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Registered email" margin="normal" type="email" />
              <Button fullWidth variant="contained" disabled={forgotLoading || (!forgotPhone && !forgotEmail)} onClick={async () => {
                setForgotLoading(true); setForgotMsg('');
                try {
                  await forgotPassword({ phone: forgotPhone || undefined, email: forgotEmail || undefined });
                  setForgotOtpSent(true);
                  setForgotStep('otp');
                } catch (err: any) { setForgotMsg(err?.response?.data?.message || 'Failed'); }
                setForgotLoading(false);
              }} sx={{ mt: 2, py: 1.5 }}>
                {forgotLoading ? <CircularProgress size={24} /> : 'Send OTP'}
              </Button>
            </>
          )}
          {forgotMsg && forgotStep !== 'done' && <Alert severity="error" sx={{ mt: 1 }}>{forgotMsg}</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={() => { setForgotOpen(false); setForgotStep('input'); setForgotOtp(''); setForgotNewPassword(''); setForgotMsg(''); }}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
