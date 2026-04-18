import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Paper,
  Typography,
  Stack,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { SlicingParams } from '../services/types';

interface SlicingParamsFormProps {
  onSubmit: (params: SlicingParams) => void;
  loading?: boolean;
}

const SlicingParamsForm: React.FC<SlicingParamsFormProps> = ({ onSubmit, loading }) => {
  const defaultParams: SlicingParams = {
    material: 'PLA',
    layerHeight: 0.2,
    infillDensity: 20,
    infillPattern: 'grid',
    wallThickness: 0.8,
    topBottomLayers: 3,
    supportEnabled: false,
    supportType: 'none',
    supportDensity: 20,
    printSpeed: 50,
    buildPlateAdhesion: 'none',
    nozzleTemp: 210,
    bedTemp: 60,
  };

  const [params, setParams] = useState<SlicingParams>(defaultParams);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const applyPreset = (preset: 'safe' | 'balanced' | 'performance') => {
    if (preset === 'safe') {
      setParams({ ...defaultParams, layerHeight: 0.15, infillDensity: 15, printSpeed: 45, nozzleTemp: 205, bedTemp: 55 });
      setAdvancedExpanded(false);
    }
    if (preset === 'balanced') {
      setParams({ ...defaultParams, layerHeight: 0.2, infillDensity: 20, printSpeed: 55, nozzleTemp: 210, bedTemp: 60 });
      setAdvancedExpanded(false);
    }
    if (preset === 'performance') {
      setParams({ ...defaultParams, layerHeight: 0.28, infillDensity: 10, printSpeed: 75, nozzleTemp: 215, bedTemp: 60 });
      setAdvancedExpanded(true);
    }
  };

  const summaryTiles = [
    { label: 'Material', value: params.material },
    { label: 'Layer', value: `${params.layerHeight} mm` },
    { label: 'Infill', value: `${params.infillDensity}%` },
    { label: 'Speed', value: `${params.printSpeed} mm/s` },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        animation: 'slideInUp 0.6s ease-out',
        transition: 'all 0.3s ease',
        background: 'linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.25}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Slicing Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tune the print profile with presets, then expose advanced controls only when you need them.
          </Typography>
        </Box>
        <Button
          variant="text"
          onClick={() => setParams(defaultParams)}
          sx={{ textTransform: 'none', fontWeight: 700, color: '#0f6cbd' }}
        >
          Reset to defaults
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
        <Chip label="Safe PLA" clickable onClick={() => applyPreset('safe')} sx={{ fontWeight: 700 }} />
        <Chip label="Balanced" clickable onClick={() => applyPreset('balanced')} color="primary" sx={{ fontWeight: 700 }} />
        <Chip label="Performance" clickable onClick={() => applyPreset('performance')} sx={{ fontWeight: 700 }} />
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 2.25 }}>
        {summaryTiles.map((tile) => (
          <Grid item xs={6} sm={3} key={tile.label}>
            <Paper
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid #e6ebf1',
                boxShadow: 'none',
                background: 'linear-gradient(180deg, rgba(15,108,189,0.04) 0%, rgba(31,122,107,0.03) 100%)',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {tile.label}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 800, color: '#0f172a' }}>
                {tile.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)', boxShadow: 'none', border: '1px solid #e6ebf1' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
            Material and Quality
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Material</InputLabel>
                <Select
                  value={params.material}
                  label="Material"
                  onChange={(e) => setParams({ ...params, material: e.target.value as any })}
                >
                  <MenuItem value="PLA">PLA</MenuItem>
                  <MenuItem value="ABS">ABS</MenuItem>
                  <MenuItem value="PETG">PETG</MenuItem>
                  <MenuItem value="TPU">TPU</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Layer Height (mm)</InputLabel>
                <Select
                  value={params.layerHeight}
                  label="Layer Height (mm)"
                  onChange={(e) => setParams({ ...params, layerHeight: e.target.value as number })}
                >
                  <MenuItem value={0.1}>0.1</MenuItem>
                  <MenuItem value={0.15}>0.15</MenuItem>
                  <MenuItem value={0.2}>0.2</MenuItem>
                  <MenuItem value={0.28}>0.28</MenuItem>
                  <MenuItem value={0.4}>0.4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)', boxShadow: 'none', border: '1px solid #e6ebf1' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>
            Structure
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Infill Density (%)"
                value={params.infillDensity}
                onChange={(e) => setParams({ ...params, infillDensity: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Infill Pattern</InputLabel>
                <Select
                  value={params.infillPattern}
                  label="Infill Pattern"
                  onChange={(e) => setParams({ ...params, infillPattern: e.target.value as any })}
                >
                  <MenuItem value="grid">Grid</MenuItem>
                  <MenuItem value="lines">Lines</MenuItem>
                  <MenuItem value="triangles">Triangles</MenuItem>
                  <MenuItem value="cubic">Cubic</MenuItem>
                  <MenuItem value="gyroid">Gyroid</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Wall Thickness (mm)"
                value={params.wallThickness}
                onChange={(e) => setParams({ ...params, wallThickness: parseFloat(e.target.value) })}
                inputProps={{ min: 0.1, step: 0.1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Top/Bottom Layers"
                value={params.topBottomLayers}
                onChange={(e) => setParams({ ...params, topBottomLayers: parseInt(e.target.value) })}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </Paper>

        <Accordion
          expanded={advancedExpanded}
          onChange={() => setAdvancedExpanded(!advancedExpanded)}
          sx={{
            boxShadow: 'none',
            border: '1px solid #e6ebf1',
            borderRadius: '12px',
            '&:before': { display: 'none' },
            overflow: 'hidden',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Advanced settings</Typography>
              <Typography variant="caption" color="text.secondary">
                Supports, adhesion, and thermal tuning
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0, borderTop: '1px solid #e6ebf1' }}>
            <Grid container spacing={2} sx={{ pt: 2 }}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Structural support
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={params.supportEnabled}
                      onChange={(e) => setParams({ ...params, supportEnabled: e.target.checked })}
                    />
                  }
                  label="Enable support"
                />
              </Grid>

              {params.supportEnabled && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Support Type</InputLabel>
                      <Select
                        value={params.supportType}
                        label="Support Type"
                        onChange={(e) => setParams({ ...params, supportType: e.target.value as any })}
                      >
                        <MenuItem value="touching_buildplate">Touching Buildplate</MenuItem>
                        <MenuItem value="everywhere">Everywhere</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Support Density (%)"
                      value={params.supportDensity}
                      onChange={(e) => setParams({ ...params, supportDensity: parseFloat(e.target.value) })}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Build surface
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Build Plate Adhesion</InputLabel>
                  <Select
                    value={params.buildPlateAdhesion}
                    label="Build Plate Adhesion"
                    onChange={(e) => setParams({ ...params, buildPlateAdhesion: e.target.value as any })}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="skirt">Skirt</MenuItem>
                    <MenuItem value="brim">Brim</MenuItem>
                    <MenuItem value="raft">Raft</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Thermal & speed
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Print Speed (mm/s)"
                  value={params.printSpeed}
                  onChange={(e) => setParams({ ...params, printSpeed: parseFloat(e.target.value) })}
                  inputProps={{ min: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Nozzle Temp (°C)"
                  value={params.nozzleTemp}
                  onChange={(e) => setParams({ ...params, nozzleTemp: parseInt(e.target.value) })}
                  inputProps={{ min: 150, max: 300 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Bed Temp (°C)"
                  value={params.bedTemp}
                  onChange={(e) => setParams({ ...params, bedTemp: parseInt(e.target.value) })}
                  inputProps={{ min: 0, max: 120 }}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5} sx={{ mt: 2.5 }}>
          <Typography variant="caption" color="text.secondary">
            Tip: start with PLA, 0.2mm layer height, and 20% infill for a balanced estimate.
          </Typography>
          <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: { xs: '100%', sm: 200 }, textTransform: 'none', fontWeight: 700 }}>
            {loading ? 'Slicing...' : 'Start slicing'}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
};

export default SlicingParamsForm;
