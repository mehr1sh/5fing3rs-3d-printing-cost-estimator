import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Grid, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip, Button,
    Divider, Stack, IconButton, Tab, Tabs, TextField, CircularProgress,
    AppBar, Toolbar, Alert, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    Dashboard as DashboardIcon,
    Refresh as RefreshIcon,
    Error as ErrorIcon,
    ListAlt as JobsIcon,
    People as UsersIcon,
    Code as TerminalIcon,
    ExitToApp as LogoutIcon,
    AccountCircle as UserIcon,
    Settings as SettingsIcon,
    Storage as MaterialIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Job, Material } from '../services/types';

interface DashboardStats {
    total_users: number;
    total_jobs: number;
    failed_jobs: number;
    running_jobs: number;
}

interface FailureLog {
    id: number;
    job_id: string | null;
    error_type: string;
    error_message: string;
    created_at: string;
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [config, setConfig] = useState<Record<string, string>>({});
    const [failureLogs, setFailureLogs] = useState<FailureLog[]>([]);
    const [systemLogs, setSystemLogs] = useState('');

    // Dialog States
    const [materialDialog, setMaterialDialog] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [materialFormData, setMaterialFormData] = useState({ name: '', density_g_cm3: 0, cost_per_gram: 0 });

    const loadAllData = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const [statsData, jobsData, materialsData, configData, logsData, sysLogsData] = await Promise.all([
                adminAPI.getStats(),
                adminAPI.getAllJobs(0, 50),
                adminAPI.getMaterials(),
                adminAPI.getConfig(),
                adminAPI.getLogs(0, 50),
                adminAPI.getSystemLogs(200)
            ]);
            setStats(statsData);
            setJobs(Array.isArray(jobsData) ? jobsData : []);
            setMaterials(Array.isArray(materialsData) ? materialsData : []);
            setConfig(configData || {});
            setFailureLogs(Array.isArray(logsData) ? logsData : []);
            setSystemLogs(sysLogsData?.logs || 'No logs available.');
        } catch (err: any) {
            console.error('Failed to load dashboard data:', err);
            setError(err.response?.data?.detail || 'Failed to connect to administrative services.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAllData();
        const interval = setInterval(loadAllData, 60000); // Auto-refresh every 1m
        return () => clearInterval(interval);
    }, []);

    // Material Actions
    const handleOpenMaterial = (material?: Material) => {
        if (material) {
            setEditingMaterial(material);
            setMaterialFormData({
                name: material.name,
                density_g_cm3: material.density_g_cm3,
                cost_per_gram: Number(material.cost_per_gram),
            });
        } else {
            setEditingMaterial(null);
            setMaterialFormData({ name: '', density_g_cm3: 1.25, cost_per_gram: 2.5 });
        }
        setMaterialDialog(true);
    };

    const handleSaveMaterial = async () => {
        try {
            if (editingMaterial) {
                await adminAPI.updateMaterial(editingMaterial.id, materialFormData);
            } else {
                await adminAPI.createMaterial(materialFormData);
            }
            setMaterialDialog(false);
            loadAllData();
        } catch (err) {
            alert('Failed to save material');
        }
    };

    const handleDeleteMaterial = async (id: number) => {
        if (!confirm('Are you sure you want to delete this material?')) return;
        try {
            await adminAPI.deleteMaterial(id);
            loadAllData();
        } catch (err) {
            alert('Failed to delete material');
        }
    };

    // Config Actions
    const handleSaveConfig = async (key: string, value: string) => {
        try {
            await adminAPI.updateConfig(key, value);
            setConfig({ ...config, [key]: value });
        } catch (err) {
            alert('Failed to update configuration');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'slicing': return 'primary';
            case 'uploaded': return 'info';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
                <Stack alignItems="center" spacing={2}>
                    <CircularProgress size={60} thickness={4} />
                    <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Initializing Management Console...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
            <AppBar position="sticky" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ bgcolor: 'primary.main', p: 1, borderRadius: 1.5, display: 'flex' }}>
                            <DashboardIcon sx={{ color: 'white' }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                                5FING3RS Admin
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            icon={<UserIcon />}
                            label={user?.username || 'Admin'}
                            variant="outlined"
                            size="small"
                        />
                        <Button size="small" variant="text" onClick={() => navigate('/dashboard')}>
                            User Dashboard
                        </Button>
                        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                        <IconButton onClick={logout} color="error" size="small">
                            <LogoutIcon />
                        </IconButton>
                    </Stack>
                </Toolbar>
            </AppBar>

            <Container maxWidth="xl" sx={{ py: 4 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 4 }} variant="filled" action={
                        <Button color="inherit" size="small" onClick={loadAllData}>RETRY</Button>
                    }>
                        {error}
                    </Alert>
                )}

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                            Unified Dashboard
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Materials, Configuration, and Job Analytics
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={refreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        onClick={loadAllData}
                        disabled={refreshing}
                    >
                        {refreshing ? 'Syncing...' : 'Refresh Hub'}
                    </Button>
                </Stack>

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    {[
                        { label: 'Total Users', value: stats?.total_users ?? 0, icon: <UsersIcon />, color: '#0f6cbd' },
                        { label: 'Total Jobs', value: stats?.total_jobs ?? 0, icon: <JobsIcon />, color: '#1f7a6b' },
                        { label: 'Current Tasks', value: stats?.running_jobs ?? 0, icon: <RefreshIcon />, color: '#0078d4' },
                        { label: 'System Alerts', value: stats?.failed_jobs ?? 0, icon: <ErrorIcon />, color: '#d13438' },
                    ].map((stat, i) => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Paper sx={{ p: 3, borderLeft: `6px solid ${stat.color}`, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${stat.color}15`, color: stat.color, display: 'flex' }}>
                                    {stat.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{stat.value}</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em', mt: 0.5, display: 'block' }}>
                                        {stat.label}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* Feature Tabs */}
                <Paper sx={{ overflow: 'hidden', borderRadius: 3 }}>
                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            px: 2,
                            bgcolor: 'rgba(0,0,0,0.01)'
                        }}
                    >
                        <Tab label="Jobs" icon={<JobsIcon />} iconPosition="start" />
                        <Tab label="Materials" icon={<MaterialIcon />} iconPosition="start" />
                        <Tab label="Config" icon={<SettingsIcon />} iconPosition="start" />
                        <Tab label="Diagnostics" icon={<TerminalIcon />} iconPosition="start" />
                    </Tabs>

                    <Box sx={{ minHeight: 500 }}>
                        {tab === 0 && (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>Job Reference</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Material</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Total Cost</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {jobs.map((job) => (
                                            <TableRow key={job.job_id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/job/${job.job_id}`)}>
                                                <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                                                    {job.job_id.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={job.status.toUpperCase()}
                                                        size="small"
                                                        color={getStatusColor(job.status) as any}
                                                        variant="filled"
                                                    />
                                                </TableCell>
                                                <TableCell>{job.filename}</TableCell>
                                                <TableCell sx={{ fontWeight: 800 }}>
                                                    {new Date(job.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}

                        {tab === 1 && (
                            <Box sx={{ p: 4 }}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                                    <Typography variant="h6">Material Inventory</Typography>
                                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenMaterial()}>
                                        New Material
                                    </Button>
                                </Stack>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Density</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Cost/g</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {materials.map((m) => (
                                                <TableRow key={m.id}>
                                                    <TableCell>{m.name}</TableCell>
                                                    <TableCell>{m.density_g_cm3} g/cm³</TableCell>
                                                    <TableCell>${Number(m.cost_per_gram).toFixed(4)}</TableCell>
                                                    <TableCell align="right">
                                                        <IconButton onClick={() => handleOpenMaterial(m)} color="primary"><EditIcon /></IconButton>
                                                        <IconButton onClick={() => handleDeleteMaterial(m.id)} color="error"><DeleteIcon /></IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}

                        {/* Config Tab */}
                        {tab === 2 && (
                            <Box sx={{ p: 4 }}>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Paper variant="outlined" sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom>Economic Factors</Typography>
                                            <Stack spacing={2}>
                                                <TextField
                                                    label="Machine Rate ($/hr)"
                                                    fullWidth
                                                    value={config.machine_hourly_rate || ''}
                                                    onChange={(e) => setConfig({ ...config, machine_hourly_rate: e.target.value })}
                                                    onBlur={(e) => handleSaveConfig('machine_hourly_rate', e.target.value)}
                                                />
                                                <TextField
                                                    label="Waste Multiplier"
                                                    fullWidth
                                                    value={config.waste_factor || ''}
                                                    onChange={(e) => setConfig({ ...config, waste_factor: e.target.value })}
                                                    onBlur={(e) => handleSaveConfig('waste_factor', e.target.value)}
                                                />
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Paper variant="outlined" sx={{ p: 3 }}>
                                            <Typography variant="h6" gutterBottom>Constraints</Typography>
                                            <Stack spacing={2}>
                                                <TextField label="Max X" value={config.printer_volume_x || ''} onBlur={(e) => handleSaveConfig('printer_volume_x', e.target.value)} />
                                                <TextField label="Max Y" value={config.printer_volume_y || ''} onBlur={(e) => handleSaveConfig('printer_volume_y', e.target.value)} />
                                                <TextField label="Max Z" value={config.printer_volume_z || ''} onBlur={(e) => handleSaveConfig('printer_volume_z', e.target.value)} />
                                            </Stack>
                                        </Paper>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {/* Diagnostics Tab */}
                        {tab === 3 && (
                            <Box sx={{ p: 0 }}>
                                <Grid container sx={{ height: 500 }}>
                                    <Grid item xs={4} sx={{ borderRight: 1, borderColor: 'divider', overflow: 'auto' }}>
                                        {failureLogs.map(log => (
                                            <Box key={log.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                                <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>{log.error_type}</Typography>
                                                <Typography variant="body2" noWrap>{log.error_message}</Typography>
                                            </Box>
                                        ))}
                                    </Grid>
                                    <Grid item xs={8} sx={{ bgcolor: '#000', color: '#0f0', p: 2, overflow: 'auto', fontFamily: 'monospace' }}>
                                        <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>SYSTEM_LOGS</Typography>
                                        <pre style={{ margin: 0, fontSize: '0.75rem' }}>{systemLogs}</pre>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Container>

            <Dialog open={materialDialog} onClose={() => setMaterialDialog(false)}>
                <DialogTitle>Material Details</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <TextField label="Name" fullWidth margin="normal" value={materialFormData.name} onChange={e => setMaterialFormData({ ...materialFormData, name: e.target.value })} />
                        <TextField label="Density" fullWidth margin="normal" value={materialFormData.density_g_cm3} onChange={e => setMaterialFormData({ ...materialFormData, density_g_cm3: parseFloat(e.target.value) })} />
                        <TextField label="Cost/g" fullWidth margin="normal" value={materialFormData.cost_per_gram} onChange={e => setMaterialFormData({ ...materialFormData, cost_per_gram: parseFloat(e.target.value) })} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setMaterialDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveMaterial} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminDashboard;
