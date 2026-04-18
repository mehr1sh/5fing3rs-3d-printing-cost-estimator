import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Grid,
  Card,
  CardContent,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FileUploader from '../components/FileUploader';
import JobTable from '../components/JobTable';
import { uploadAPI } from '../services/api';
import type { Job } from '../services/types';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      const newJob = await uploadAPI.upload(file);
      setJobs([newJob, ...jobs]);
      navigate(`/job/${newJob.job_id}`);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const data = await uploadAPI.getJobs();
        setJobs(data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ boxShadow: '0 2px 8px rgba(15, 35, 95, 0.12)', background: 'linear-gradient(135deg, #ffffff 0%, #f9fbfd 100%)', borderBottom: '1px solid #e6ebf1' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 2.5 } }}>
          <Typography variant="h6" component="div" sx={{ color: '#0f6cbd', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 32, height: 32, background: 'linear-gradient(135deg, #0f6cbd, #1f7a6b)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>3</Box>
            3D Platform
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            <Typography variant="body2" sx={{ color: '#5f6b7a', display: { xs: 'none', sm: 'block' } }}>
              {user?.username}
            </Typography>
            {isAdmin && (
              <>
                <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={() => navigate('/admin/materials')}>
                  Materials
                </Button>
                <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={() => navigate('/admin/config')}>
                  Config
                </Button>
                <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={() => navigate('/admin/logs')}>
                  Logs
                </Button>
              </>
            )}
            <Button color="inherit" sx={{ color: '#0f6cbd', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', '&:hover': { bgcolor: 'rgba(15, 108, 189, 0.08)' } }} onClick={logout}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, animation: 'slideInUp 0.5s ease-out' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ animation: 'slideInDown 0.6s ease-out' }}>
          Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sx={{ animation: 'fadeIn 0.7s ease-out' }}>
            <Card sx={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { boxShadow: '0 20px 40px rgba(15, 35, 95, 0.12)' } }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload 3D Model
                </Typography>
                <FileUploader onUpload={handleUpload} loading={loading} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sx={{ animation: 'fadeIn 0.8s ease-out 0.1s both' }}>
            <Paper sx={{ p: 2, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <Typography variant="h6" gutterBottom>
                Recent Jobs
              </Typography>
              <JobTable jobs={jobs} />
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
