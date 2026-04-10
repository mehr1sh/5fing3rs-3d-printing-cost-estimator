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
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          3D Printing Cost Estimation Platform
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
          Five Fingers Innovative Solutions
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          sx={{ mb: 3 }}
          onClick={() => navigate('/viewer')}
        >
          Try 3D Viewer (no login required)
        </Button>

        {!otpMode && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }}>
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
            <Typography variant="body1" sx={{ mb: 2 }}>
              A 6-digit verification code has been sent to your email.
            </Typography>
            <TextField
              fullWidth
              label="Verification Code (6 digits)"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Verify & Login
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => { setOtpMode(false); setError(''); }}
            >
              Back to Login
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Login
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              Register
            </Button>
          </form>
        )}
      </Paper>
    </Container>
  );
};

export default Home;
