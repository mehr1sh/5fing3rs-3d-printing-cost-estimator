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
  Button,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import type { CostEstimate } from '../services/types';

interface CostBreakdownProps {
  estimate: CostEstimate;
  filename?: string;
}

const CostBreakdown: React.FC<CostBreakdownProps> = ({ estimate, filename }) => {

  const handleDownloadPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>3D Print Quote</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #1a1a2e;
      padding: 48px;
      font-size: 14px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 3px solid #1976d2;
    }
    .brand h1 {
      font-size: 26px;
      font-weight: 700;
      color: #1976d2;
      letter-spacing: -0.5px;
    }
    .brand p {
      color: #666;
      font-size: 13px;
      margin-top: 4px;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-meta .quote-id {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a2e;
    }
    .quote-meta p {
      color: #666;
      font-size: 12px;
      margin-top: 4px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #1976d2;
      margin-bottom: 12px;
      margin-top: 32px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 8px;
    }
    .info-item {
      background: #f8f9ff;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .info-item .label {
      font-size: 11px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .info-item .value {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    tr {
      border-bottom: 1px solid #f0f0f0;
    }
    td {
      padding: 12px 8px;
      font-size: 14px;
    }
    td:last-child {
      text-align: right;
      font-weight: 500;
    }
    .subtotal-row td {
      color: #888;
      font-size: 13px;
      padding: 8px 8px;
    }
    .total-row {
      border-top: 2px solid #1976d2 !important;
      border-bottom: none !important;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 700;
      color: #1976d2;
      padding-top: 16px;
    }
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      color: #aaa;
      font-size: 11px;
    }
    .validity-badge {
      background: #e8f4fd;
      color: #1976d2;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      display: inline-block;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>Five Fingers</h1>
      <p>Innovative Solutions · 3D Printing Portal</p>
    </div>
  </div>

  <div class="section-title">Job Details</div>
  <div class="info-grid">
    <div class="info-item">
      <div class="label">File Name</div>
      <div class="value">${filename || 'model.stl'}</div>
    </div>
    <div class="info-item">
      <div class="label">Job ID</div>
      <div class="value" style="font-size:12px; font-family: monospace;">${estimate.job_id}</div>
    </div>
    <div class="info-item">
      <div class="label">Material Weight</div>
      <div class="value">${estimate.breakdown.material_weight_grams.toFixed(2)} g</div>
    </div>
    <div class="info-item">
      <div class="label">Print Time</div>
      <div class="value">${estimate.breakdown.print_time_hours.toFixed(2)} hrs</div>
    </div>
    <div class="info-item">
      <div class="label">Layer Count</div>
      <div class="value">${estimate.breakdown.layer_count}</div>
    </div>
    <div class="info-item">
      <div class="label">Currency</div>
      <div class="value">${estimate.currency}</div>
    </div>
  </div>

  <div class="section-title">Cost Breakdown</div>
  <table>
    <tbody>
      <tr>
        <td>Material Cost</td>
        <td>₹${estimate.material_cost.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Support Material Cost</td>
        <td>₹${estimate.support_cost.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Machine Time Cost</td>
        <td>₹${estimate.machine_cost.toFixed(2)}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Subtotal</td>
        <td>₹${estimate.subtotal.toFixed(2)}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Waste Overhead (25%)</td>
        <td>₹${estimate.waste_overhead.toFixed(2)}</td>
      </tr>
      <tr class="subtotal-row">
        <td>Failure Overhead (25%)</td>
        <td>₹${estimate.failure_overhead.toFixed(2)}</td>
      </tr>
      <tr class="total-row">
        <td>Total Cost</td>
        <td>₹${estimate.total_cost.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="validity-badge">✓ Quote valid for 7 days</div>

  <div class="footer">
    <span>Five Fingers Innovative Solutions</span>
    <span>Generated on ${dateStr} at ${timeStr}</span>
  </div>
</body>
</html>`;

    // Open in new tab and trigger print/save as PDF
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Cost Breakdown
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPDF}
          size="small"
        >
          Download Quote PDF
        </Button>
      </Box>

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
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">₹{estimate.subtotal.toFixed(2)}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">Waste Overhead (25%)</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">₹{estimate.waste_overhead.toFixed(2)}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="body2" color="text.secondary">Failure Overhead (25%)</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">₹{estimate.failure_overhead.toFixed(2)}</Typography>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <Typography variant="h6"><strong>Total Cost</strong></Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="h6"><strong>₹{estimate.total_cost.toFixed(2)}</strong></Typography>
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
