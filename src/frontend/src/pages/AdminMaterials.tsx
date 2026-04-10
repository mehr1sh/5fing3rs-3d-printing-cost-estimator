import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  AppBar,
  Toolbar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { adminAPI } from '../services/api';
import type { Material } from '../services/types';

const AdminMaterials: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [formData, setFormData] = useState({ name: '', density_g_cm3: 0, cost_per_gram: 0 });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = await adminAPI.getMaterials();
      setMaterials(data);
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const handleOpen = (material?: Material) => {
    if (material) {
      setEditing(material);
      setFormData({
        name: material.name,
        density_g_cm3: material.density_g_cm3,
        cost_per_gram: Number(material.cost_per_gram),
      });
    } else {
      setEditing(null);
      setFormData({ name: '', density_g_cm3: 0, cost_per_gram: 0 });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await adminAPI.updateMaterial(editing.id, formData);
      } else {
        await adminAPI.createMaterial(formData);
      }
      handleClose();
      loadMaterials();
    } catch (err) {
      alert('Failed to save material');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await adminAPI.deleteMaterial(id);
      loadMaterials();
    } catch (err) {
      alert('Failed to delete material');
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Materials Management
          </Typography>
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Materials</Typography>
          <Button variant="contained" onClick={() => handleOpen()}>
            Add Material
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Density (g/cm³)</TableCell>
                <TableCell>Cost per Gram (INR)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>{material.density_g_cm3}</TableCell>
                  <TableCell>₹{Number(material.cost_per_gram).toFixed(4)}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(material)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(material.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>{editing ? 'Edit Material' : 'Add Material'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Density (g/cm³)"
              value={formData.density_g_cm3}
              onChange={(e) => setFormData({ ...formData, density_g_cm3: parseFloat(e.target.value) })}
              margin="normal"
            />
            <TextField
              fullWidth
              type="number"
              label="Cost per Gram (INR)"
              value={formData.cost_per_gram}
              onChange={(e) => setFormData({ ...formData, cost_per_gram: parseFloat(e.target.value) })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminMaterials;
