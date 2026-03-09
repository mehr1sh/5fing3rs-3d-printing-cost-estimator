import React, { useRef, useState } from 'react';
import { Box, Button, Typography, AppBar, Toolbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ModelViewer3D from '../components/ModelViewer3D';

const ViewerPage: React.FC = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevUrlRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const handleFile = (file: File) => {
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    const url = URL.createObjectURL(file);
    prevUrlRef.current = url;
    setModelUrl(url);
    setFileName(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) handleFile(file);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" onClick={() => navigate('/')} startIcon={<ArrowBackIcon />}>
            Back
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            3D Viewer {fileName && `— ${fileName}`}
          </Typography>
          <Button color="inherit" variant="outlined" onClick={() => inputRef.current?.click()}>
            Load STL
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".stl"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </Toolbar>
      </AppBar>

      <Box
        sx={{ flexGrow: 1, p: 2 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {modelUrl ? (
          <ModelViewer3D modelUrl={modelUrl} jobId="local" />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'grey.400',
              borderRadius: 2,
              cursor: 'pointer',
            }}
            onClick={() => inputRef.current?.click()}
          >
            <Typography variant="h6" color="text.secondary">
              Drag & drop an STL file here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              or click to browse
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ViewerPage;
