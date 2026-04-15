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
  Divider,
  Stack,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, animation: 'slideInUp 0.6s ease-out', transition: 'all 0.3s ease' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Slicing Setup
        </Typography>
        <Button variant="text" onClick={() => setParams(defaultParams)} sx={{ textTransform: 'none', fontWeight: 600, color: '#0f6cbd' }}>
          Reset to defaults
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Configure print quality, structure, supports, and thermal settings before running slicing.
      </Typography>

      <form onSubmit={handleSubmit}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
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

        <Divider sx={{ my: 2.5 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
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

        <Divider sx={{ my: 2.5 }} />

        <Accordion expanded={advancedExpanded} onChange={() => setAdvancedExpanded(!advancedExpanded)} sx={{ boxShadow: 'none', border: '1px solid #e6ebf1', borderRadius: '10px', '&:before': { display: 'none' }, transition: 'all 0.3s ease', animation: advancedExpanded ? 'slideInDown 0.3s ease-out' : 'none' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 1.5, px: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Advanced Settings</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2, borderTop: '1px solid #e6ebf1' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500 }}>Structural Support</Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={params.supportEnabled}
                      onChange={(e) => setParams({ ...params, supportEnabled: e.target.checked })}
                    />
                  }
                  label="Enable Support"
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500, mt: 1 }}>Build Surface Treatment</Typography>
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
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 500, mt: 1 }}>Thermal & Speed Control</Typography>
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
          <Button type="submit" variant="contained" disabled={loading} sx={{ minWidth: { xs: '100%', sm: 180 }, textTransform: 'none', fontWeight: 600 }}>
            {loading ? 'Slicing...' : 'Start slicing'}
          </Button>
        </Box>
      </form>

      <Divider sx={{ my: 2.5 }} />
      <Typography variant="caption" color="text.secondary">
        Tip: start with PLA, 0.2mm layer height, and 20% infill for a balanced estimate.
      </Typography>
    </Paper>
  );
};

export default SlicingParamsForm;
