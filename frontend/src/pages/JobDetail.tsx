import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import ModelViewer3D from '../components/ModelViewer3D';
import SlicingParamsForm from '../components/SlicingParamsForm';
import GCodePreview from '../components/GCodePreview';
import CostBreakdown from '../components/CostBreakdown';
import { uploadAPI, slicingAPI, estimationAPI } from '../services/api';
import type { Job, SlicingParams, CostEstimate } from '../services/types';

const JobDetail: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [slicing, setSlicing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = async () => {
      try {
        const jobData = await uploadAPI.getJob(jobId);
        setJob(jobData);

        try {
          const blob = await uploadAPI.downloadModel(jobId);
          const url = URL.createObjectURL(blob);
          setModelUrl(url);
        } catch (modelErr: any) {
          console.error('Failed to load model file:', modelErr);
          setError('Failed to load model file. Job details loaded successfully.');
        }
      } catch (err: any) {
        console.error('Failed to load job:', err);
        setError(err.response?.data?.detail || 'Failed to load job');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  useEffect(() => {
    return () => {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
    };
  }, [modelUrl]);

  const handleSlice = async (params: SlicingParams) => {
    if (!jobId) return;

    setSlicing(true);
    setError(null);

    try {
      await slicingAPI.slice(jobId, params);

      const pollInterval = setInterval(async () => {
        try {
          const updatedJob = await uploadAPI.getJob(jobId);
          setJob(updatedJob);

          if (updatedJob.status === 'sliced') {
            clearInterval(pollInterval);
            setSlicing(false);

            try {
              const estimate = await estimationAPI.estimate(jobId);
              setCostEstimate(estimate);
            } catch (err) {
              console.error('Failed to get cost estimate:', err);
            }
          } else if (updatedJob.status === 'failed') {
            clearInterval(pollInterval);
            setSlicing(false);
            setError('Slicing failed. Please check the logs.');
          }
        } catch (err) {
          clearInterval(pollInterval);
          setSlicing(false);
          setError('Failed to check slicing status');
        }
      }, 2000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (slicing) {
          setSlicing(false);
          setError('Slicing is taking longer than expected. Please check back later.');
        }
      }, 120000);
    } catch (err: any) {
      setSlicing(false);
      setError(err.response?.data?.detail || 'Failed to start slicing');
    }
  };

  const handleDownloadGcode = async () => {
    if (!jobId) return;

    try {
      const blob = await slicingAPI.downloadGcode(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job?.original_filename || 'model'}.gcode`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download G-code');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !job) {
    return (
      <Box>
        <AppBar position="static">
          <Toolbar>
            <Button color="inherit" onClick={() => navigate('/dashboard')}>
              <ArrowBackIcon /> Back
            </Button>
          </Toolbar>
        </AppBar>
        <Container sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!job) {
    return null;
  }

  const statusColor: 'default' | 'success' | 'warning' | 'error' =
    job.status === 'sliced'
      ? 'success'
      : job.status === 'slicing'
        ? 'warning'
        : job.status === 'failed'
          ? 'error'
          : 'default';

  const slicingResult = job.slicing_result;

  return (
    <Box>
      <AppBar position="static" sx={{ boxShadow: '0 2px 8px rgba(15, 35, 95, 0.12)', background: 'linear-gradient(135deg, #ffffff 0%, #f9fbfd 100%)', borderBottom: '1px solid #e6ebf1' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 2.5 } }}>
          <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, display: 'flex', gap: 1, '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon sx={{ fontSize: 20 }} />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Back</Box>
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: { xs: 1, sm: 2 }, color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.original_filename}
          </Typography>
          <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 5, animation: 'slideInUp 0.5s ease-out' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, animation: 'slideInDown 0.4s ease-out' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          <Grid item xs={12} sx={{ animation: 'slideInDown 0.6s ease-out' }}>
            <Paper sx={{ p: { xs: 2, md: 2.5 }, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={{ xs: 1, sm: 1.5 }}
              >
                <Box>
                  <Typography variant="h6">Job Workspace</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Inspect the model, tune slicing settings, and review G-code and final quote.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={job.status} color={statusColor} sx={{ textTransform: 'capitalize' }} />
                  <Chip label={job.filename} variant="outlined" />
                </Stack>
              </Stack>
            </Paper>
          </Grid>

          {job.status === 'sliced' && slicingResult && (
            <>
              {[0, 1, 2, 3].map((idx) => {
                const stats = [
                  { label: 'Print Time', value: `${((slicingResult.print_time_seconds || 0) / 3600).toFixed(2)} h` },
                  { label: 'Material', value: `${(slicingResult.material_weight_grams || 0).toFixed(2)} g` },
                  { label: 'Layers', value: `${slicingResult.layer_count || 0}` },
                  { label: 'Estimated Cost', value: `₹${(slicingResult.estimated_cost || 0).toFixed(2)}` },
                ];
                return (
                  <Grid item xs={12} sm={6} md={3} key={idx} sx={{ animation: `slideInUp 0.5s ease-out ${0.1 * (idx + 1)}s both` }}>
                    <Paper sx={{ p: 2, transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(15, 35, 95, 0.12)' } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>{stats[idx].label}</Typography>
                      <Typography variant="h6" sx={{ color: '#0f6cbd', fontWeight: 700 }}>{stats[idx].value}</Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </>
          )}

          {modelUrl && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out 0.2s both' }}>
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, transition: 'all 0.3s ease' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Model Inspector</Typography>
                <Box sx={{ overflow: 'hidden', borderRadius: '8px' }}>
                  <ModelViewer3D modelUrl={modelUrl} jobId={jobId!} />
                </Box>
              </Paper>
            </Grid>
          )}

          {job.status === 'uploaded' && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out 0.3s both' }}>
              <SlicingParamsForm onSubmit={handleSlice} loading={slicing} />
            </Grid>
          )}

          {job.status === 'slicing' && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out' }}>
              <Paper sx={{ p: { xs: 2.5, sm: 3 }, textAlign: 'center', background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f9fe 100%)' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography sx={{ fontWeight: 500 }}>Slicing in progress...</Typography>
              </Paper>
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out 0.4s both' }}>
              <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 1, transition: 'all 0.3s ease' }}>
                <Typography variant="h6" sx={{ mb: 1.5 }}>Post-slicing Results</Typography>
                <Button variant="contained" onClick={handleDownloadGcode} sx={{ textTransform: 'none', fontWeight: 600 }}>
                  Download G-code
                </Button>
              </Paper>
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out 0.5s both' }}>
              <GCodePreview
                gcodeUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/files/${jobId}/output.gcode`}
              />
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12} sx={{ animation: 'slideInUp 0.6s ease-out 0.6s both' }}>
              {costEstimate ? (
                <CostBreakdown estimate={costEstimate} filename={job.original_filename} />
              ) : (
                <Paper sx={{ p: { xs: 2, sm: 2.5 }, background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f9fe 100%)' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>
                    Cost estimate is not loaded yet for this sliced job.
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                    onClick={async () => {
                      try {
                        const estimate = await estimationAPI.estimate(jobId!);
                        setCostEstimate(estimate);
                      } catch (err: any) {
                        setError(err.response?.data?.detail || 'Failed to calculate cost');
                      }
                    }}
                  >
                    Calculate cost estimate
                  </Button>
                </Paper>
              )}
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default JobDetail;
