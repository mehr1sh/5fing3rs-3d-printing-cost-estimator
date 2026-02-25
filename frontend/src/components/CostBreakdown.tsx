import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
} from '@mui/material';
import type { CostEstimate } from '../services/types';

interface CostBreakdownProps {
  estimate: CostEstimate;
}

const CostBreakdown: React.FC<CostBreakdownProps> = ({ estimate }) => {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Cost Breakdown
      </Typography>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Material Cost</TableCell>
            <TableCell align="right">₹{estimate.material_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Support Material Cost</TableCell>
            <TableCell align="right">₹{estimate.support_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Machine Time Cost</TableCell>
            <TableCell align="right">₹{estimate.machine_cost.toFixed(2)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                Subtotal
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">
                ₹{estimate.subtotal.toFixed(2)}
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                Waste Overhead (25%)
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">
                ₹{estimate.waste_overhead.toFixed(2)}
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">
                Failure Overhead (25%)
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">
                ₹{estimate.failure_overhead.toFixed(2)}
              </Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="h6">
                <strong>Total Cost</strong>
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="h6">
                <strong>₹{estimate.total_cost.toFixed(2)}</strong>
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="body2" color="text.secondary">
          <strong>Material Weight:</strong> {estimate.breakdown.material_weight_grams.toFixed(2)} g
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Print Time:</strong> {estimate.breakdown.print_time_hours.toFixed(2)} hours
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Layers:</strong> {estimate.breakdown.layer_count}
        </Typography>
      </Box>
    </Paper>
  );
};

export default CostBreakdown;
