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
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            3D Printing Platform
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.username}
          </Typography>
          {isAdmin && (
            <>
              <Button color="inherit" onClick={() => navigate('/admin/materials')}>
                Materials
              </Button>
              <Button color="inherit" onClick={() => navigate('/admin/config')}>
                Config
              </Button>
              <Button color="inherit" onClick={() => navigate('/admin/logs')}>
                Logs
              </Button>
            </>
          )}
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload 3D Model
                </Typography>
                <FileUploader onUpload={handleUpload} loading={loading} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
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
