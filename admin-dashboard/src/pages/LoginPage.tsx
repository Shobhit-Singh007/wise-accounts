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
    </Box>
  );
}
