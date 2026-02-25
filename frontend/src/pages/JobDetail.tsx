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
  const { user, logout } = useAuth();
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

        // Create blob URL for model
        try {
          const blob = await uploadAPI.downloadModel(jobId);
          const url = URL.createObjectURL(blob);
          setModelUrl(url);
        } catch (modelErr: any) {
          console.error('Failed to load model file:', modelErr);
          // Don't set error here - just log it, model viewer will handle it
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

    // Cleanup blob URL on unmount
    return () => {
      // Cleanup will be handled by the state setter
    };
  }, [jobId]);

  // Cleanup blob URL when modelUrl changes or component unmounts
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

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const updatedJob = await uploadAPI.getJob(jobId);
          setJob(updatedJob);

          if (updatedJob.status === 'sliced') {
            clearInterval(pollInterval);
            setSlicing(false);

            // Calculate cost estimate
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

      // Timeout after 2 minutes
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

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon /> Back
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            {job.original_filename}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Status: <strong>{job.status}</strong>
              </Typography>
            </Paper>
          </Grid>

          {modelUrl && (
            <Grid item xs={12}>
              <ModelViewer3D modelUrl={modelUrl} jobId={jobId!} />
            </Grid>
          )}

          {job.status === 'uploaded' && (
            <Grid item xs={12}>
              <SlicingParamsForm onSubmit={handleSlice} loading={slicing} />
            </Grid>
          )}

          {job.status === 'slicing' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>Slicing in progress...</Typography>
              </Paper>
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Button variant="contained" onClick={handleDownloadGcode}>
                  Download G-code
                </Button>
              </Paper>
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12}>
              <GCodePreview
                gcodeUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/files/${jobId}/output.gcode`}
              />
            </Grid>
          )}

          {job.status === 'sliced' && (
            <Grid item xs={12}>
              {costEstimate ? (
                <CostBreakdown estimate={costEstimate} />
              ) : (
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      const estimate = await estimationAPI.estimate(jobId!);
                      setCostEstimate(estimate);
                    } catch (err: any) {
                      setError(err.response?.data?.detail || 'Failed to calculate cost');
                    }
                  }}
                >
                  Calculate Cost Estimate
                </Button>
              )}
            </Grid>
          )}
        </Grid>
      </Container>
    </Box>
  );
};

export default JobDetail;
