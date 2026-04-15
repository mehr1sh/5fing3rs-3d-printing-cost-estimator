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
  Grid,
  Stack,
  Chip,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PrecisionManufacturingRoundedIcon from '@mui/icons-material/PrecisionManufacturingRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
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
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 3, md: 4 }, height: '100%', bgcolor: '#0f172a', color: '#ecf2ff' }}>
              <Chip
                icon={<AutoAwesomeRoundedIcon />}
                label="Production-ready quote workflow"
                sx={{ mb: 3, bgcolor: 'rgba(58,160,243,0.22)', color: '#e7f2ff' }}
              />
              <Typography variant="h4" sx={{ mb: 1.5, color: '#f8fbff' }}>
                Instant 3D print estimates with pro-level controls
              </Typography>
              <Typography variant="body1" sx={{ color: '#b5c4dd', mb: 3 }}>
                Upload models, tune slicing parameters, preview G-code layers, and generate consistent cost quotes.
              </Typography>
              <Stack spacing={2.2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <PrecisionManufacturingRoundedIcon sx={{ color: '#57b5ff' }} />
                  <Typography variant="body2" sx={{ color: '#d2dff3' }}>
                    Cura-like model workspace with transform controls
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CalculateRoundedIcon sx={{ color: '#57b5ff' }} />
                  <Typography variant="body2" sx={{ color: '#d2dff3' }}>
                    Real slicing metrics and automated cost breakdowns
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AutoAwesomeRoundedIcon sx={{ color: '#57b5ff' }} />
                  <Typography variant="body2" sx={{ color: '#d2dff3' }}>
                    OTP-based sign-up and role-based admin controls
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: { xs: 3, md: 4 }, maxWidth: 560, ml: 'auto' }}>
              <Typography variant="h5" component="h1" sx={{ mb: 0.5 }}>
                3D Printing Cost Estimation Platform
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.2 }}>
                Five Fingers Innovative Solutions
              </Typography>

              <Button
                fullWidth
                variant="outlined"
                sx={{ mb: 2.5 }}
                onClick={() => navigate('/viewer')}
              >
                Open Public 3D Viewer
              </Button>

              {!otpMode && (
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} variant="fullWidth">
                    <Tab label="Login" />
                    <Tab label="Register" />
                  </Tabs>
                </Box>
              )}

              {error && (
                <Alert severity={error.includes('successful') || error.includes('Please enter') ? 'info' : 'error'} sx={{ mb: 2 }}>
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
                  <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5 }} disabled={loading}>
                    Verify and Continue
                  </Button>
                  <Button fullWidth variant="text" onClick={() => { setOtpMode(false); setError(''); }}>
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
                  <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5 }} disabled={loading}>
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
                  <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, mb: 1.5 }} disabled={loading}>
                    Create account
                  </Button>
                </form>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Home;
