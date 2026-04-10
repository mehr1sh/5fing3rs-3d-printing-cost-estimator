import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  TextField,
  Paper,
  Grid,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';

const AdminConfig: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await adminAPI.getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: string) => {
    try {
      await adminAPI.updateConfig(key, value);
      setConfig({ ...config, [key]: value });
      alert('Configuration updated');
    } catch (err) {
      alert('Failed to update configuration');
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Configuration
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          System Configuration
        </Typography>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Machine Settings
                </Typography>
                <TextField
                  fullWidth
                  label="Machine Hourly Rate (INR)"
                  value={config.machine_hourly_rate || ''}
                  onChange={(e) => setConfig({ ...config, machine_hourly_rate: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('machine_hourly_rate', config.machine_hourly_rate || '')}
                />
                <TextField
                  fullWidth
                  label="Waste Factor"
                  value={config.waste_factor || ''}
                  onChange={(e) => setConfig({ ...config, waste_factor: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('waste_factor', config.waste_factor || '')}
                />
                <TextField
                  fullWidth
                  label="Failure Factor"
                  value={config.failure_factor || ''}
                  onChange={(e) => setConfig({ ...config, failure_factor: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('failure_factor', config.failure_factor || '')}
                />
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Printer Build Volume (mm)
                </Typography>
                <TextField
                  fullWidth
                  label="X"
                  value={config.printer_volume_x || ''}
                  onChange={(e) => setConfig({ ...config, printer_volume_x: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('printer_volume_x', config.printer_volume_x || '')}
                />
                <TextField
                  fullWidth
                  label="Y"
                  value={config.printer_volume_y || ''}
                  onChange={(e) => setConfig({ ...config, printer_volume_y: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('printer_volume_y', config.printer_volume_y || '')}
                />
                <TextField
                  fullWidth
                  label="Z"
                  value={config.printer_volume_z || ''}
                  onChange={(e) => setConfig({ ...config, printer_volume_z: e.target.value })}
                  margin="normal"
                  onBlur={() => handleSave('printer_volume_z', config.printer_volume_z || '')}
                />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default AdminConfig;
