import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Tab,
  Tabs,
  Alert,
  Stack,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 403 && (err.response?.data?.detail?.includes('Verified') || err.response?.data?.detail?.includes('verified'))) {
        setOtpMode(true);
        setError('Please enter the verification code sent to your email to continue.');
      } else {
        setError(err.response?.data?.detail || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, password, email || undefined);
      setOtpMode(true);
      setError('Registration successful! Please check your email for the verification code.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(username, otpCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
            border: '1px solid #e4ebf4',
            animation: 'slideInUp 0.45s ease-out',
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" component="h1" sx={{ mb: 0.5 }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to manage models, slicing workflows, and cost estimates.
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => navigate('/viewer')}
            >
              Open Public 3D Viewer
            </Button>

            {!otpMode && (
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} variant="fullWidth">
                  <Tab label="Login" />
                  <Tab label="Register" />
                </Tabs>
              </Box>
            )}

            {error && (
              <Alert severity={error.includes('successful') || error.includes('Please enter') ? 'info' : 'error'}>
                {error}
              </Alert>
            )}

            {otpMode ? (
              <form onSubmit={handleVerifyOtp}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  A 6-digit verification code has been sent to your email address.
                </Typography>
                <TextField
                  fullWidth
                  label="Verification Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  margin="normal"
                  required
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5, textTransform: 'none', fontWeight: 700 }} disabled={loading}>
                  Verify and Continue
                </Button>
                <Button fullWidth variant="text" sx={{ textTransform: 'none', fontWeight: 600 }} onClick={() => { setOtpMode(false); setError(''); }}>
                  Back to login
                </Button>
              </form>
            ) : tab === 0 ? (
              <form onSubmit={handleLogin}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5, textTransform: 'none', fontWeight: 700 }} disabled={loading}>
                  Sign in
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <TextField
                  fullWidth
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5, textTransform: 'none', fontWeight: 700 }} disabled={loading}>
                  Create account
                </Button>
              </form>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default Home;
