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
} from '@mui/material';
import type { SlicingParams } from '../services/types';

interface SlicingParamsFormProps {
  onSubmit: (params: SlicingParams) => void;
  loading?: boolean;
}

const SlicingParamsForm: React.FC<SlicingParamsFormProps> = ({ onSubmit, loading }) => {
  const [params, setParams] = useState<SlicingParams>({
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
    buildPlateAdhesion: 'skirt',
    nozzleTemp: 210,
    bedTemp: 60,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(params);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Slicing Parameters
      </Typography>
      <form onSubmit={handleSubmit}>
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

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Nozzle Temperature (°C)"
              value={params.nozzleTemp}
              onChange={(e) => setParams({ ...params, nozzleTemp: parseInt(e.target.value) })}
              inputProps={{ min: 150, max: 300 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Bed Temperature (°C)"
              value={params.bedTemp}
              onChange={(e) => setParams({ ...params, bedTemp: parseInt(e.target.value) })}
              inputProps={{ min: 0, max: 120 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button type="submit" variant="contained" fullWidth disabled={loading}>
              {loading ? 'Slicing...' : 'Start Slicing'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default SlicingParamsForm;
