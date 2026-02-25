import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Job } from '../services/types';

interface JobTableProps {
  jobs: Job[];
}

const JobTable: React.FC<JobTableProps> = ({ jobs }) => {
  const navigate = useNavigate();

  if (jobs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
        No jobs yet. Upload a file to get started.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Filename</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Created</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.job_id}>
              <TableCell>{job.original_filename}</TableCell>
              <TableCell>{job.status}</TableCell>
              <TableCell>{(job.file_size / 1024 / 1024).toFixed(2)} MB</TableCell>
              <TableCell>{new Date(job.created_at).toLocaleString()}</TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => navigate(`/job/${job.job_id}`)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default JobTable;
