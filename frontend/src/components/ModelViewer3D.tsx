import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box, ButtonGroup, Button, Typography, Paper,
  Slider, TextField, Grid, Divider, FormControlLabel, Switch,
  Accordion, AccordionSummary, AccordionDetails, Stack, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

interface ModelViewer3DProps {
  modelUrl: string;
  jobId: string;
}

type ViewMode = 'solid' | 'wireframe' | 'layer';

interface Transform {
  posX: number; posY: number; posZ: number;
  rotX: number; rotY: number; rotZ: number;
  scale: number;
}

const DEFAULT_TRANSFORM: Transform = {
  posX: 0, posY: 0, posZ: 0,
  rotX: 0, rotY: 0, rotZ: 0,
  scale: 1,
};

const THEME = {
  dark: { bg: 0x2a2a2a, gridCenter: 0x00bfff, gridLines: 0x444444, ambientIntensity: 0.5, dirIntensity: 0.8 },
  light: { bg: 0xf0f0f0, gridCenter: 0x888888, gridLines: 0xcccccc, ambientIntensity: 0.7, dirIntensity: 0.6 },
};

const ModelViewer3D: React.FC<ModelViewer3DProps> = ({ modelUrl, jobId: _jobId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const basePositionYRef = useRef(0);
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [lockToGrid, setLockToGrid] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const theme = THEME.light;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.bg);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, theme.ambientIntensity);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const directionalLight = new THREE.DirectionalLight(0xffffff, theme.dirIntensity);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    dirLightRef.current = directionalLight;

    // Grid helper (build plate)
    const gridHelper = new THREE.GridHelper(200, 20, theme.gridCenter, theme.gridLines);
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Axis helper
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // Store references for cleanup
    let currentGeometry: THREE.BufferGeometry | null = null;
    let currentMaterial: THREE.Material | null = null;
    let animationId: number | null = null;

    // Load STL
    const loader = new STLLoader();
    loader.load(
      modelUrl,
      (geometry) => {
        geometry.center();
        geometry.computeVertexNormals();
        currentGeometry = geometry;

        const material = new THREE.MeshStandardMaterial({
          color: 0x1976d2,
          flatShading: false,
          metalness: 0.1,
          roughness: 0.65,
        });
        currentMaterial = material;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Fix orientation - STL files often need rotation correction
        // Try different combinations based on your model orientation:
        // Common fixes:
        // - Upside down: rotate X by 180° (Math.PI)
        // - Backwards: rotate Y by 180° (Math.PI)  
        // - Sideways: rotate Z by 90° (Math.PI/2)
        // - Combination: rotate X and Y by 180° each

        // Default: rotate 180° around X and Y axes (fixes most common issues)
        mesh.rotation.x = Math.PI / 2; // 180° around X (fixes upside-down)
        mesh.rotation.y = Math.PI; // 180° around Y (fixes backwards)

        // If this doesn't work, try:
        // mesh.rotation.x = 0; mesh.rotation.y = 0; // No rotation
        // mesh.rotation.x = Math.PI; mesh.rotation.y = 0; // Only X rotation
        // mesh.rotation.x = 0; mesh.rotation.y = Math.PI; // Only Y rotation
        // mesh.rotation.z = Math.PI / 2; // 90° Z rotation for sideways

        scene.add(mesh);
        meshRef.current = mesh;

        // Step 1: Get bounding box BEFORE any position adjustment
        const box = new THREE.Box3().setFromObject(mesh);

        // Step 2: Center the mesh on X and Z axes (so it sits at origin horizontally)
        const centerXZ = box.getCenter(new THREE.Vector3());
        mesh.position.x -= centerXZ.x;
        mesh.position.z -= centerXZ.z;

        // Step 3: Lift mesh so its bottom sits on the grid (y=0)
        mesh.position.y -= box.min.y;
        basePositionYRef.current = mesh.position.y;
        setTransform(DEFAULT_TRANSFORM);

        // Step 4: Recalculate bounding box AFTER repositioning
        box.setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        setModelInfo({
          dimensions: {
            x: size.x.toFixed(2),
            y: size.y.toFixed(2),
            z: size.z.toFixed(2),
          },
          center: {
            x: center.x.toFixed(2),
            y: center.y.toFixed(2),
            z: center.z.toFixed(2),
          },
          triangleCount: geometry.attributes.position.count / 3,
        });

        // Step 5: Point camera at the true center of the repositioned model
        // Use a diagonal offset based on model size so the whole model is visible
        const maxDim = Math.max(size.x, size.y, size.z);
        controls.target.copy(center);
        camera.position.set(
          center.x + maxDim * 1.5,
          center.y + maxDim * 1.5,
          center.z + maxDim * 1.5
        );
        camera.lookAt(center);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        setError('Failed to load model: ' + err); // capture load errors
        setLoading(false);
      }
    );

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => { // cleanup on model change, cancel animatin frame, etc.
      window.removeEventListener('resize', handleResize);
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      if (currentGeometry) {
        currentGeometry.dispose();
      }
      if (currentMaterial) {
        currentMaterial.dispose();
      }
      if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [modelUrl]);

  // Update view mode
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const material = mesh.material as THREE.MeshStandardMaterial;

    switch (viewMode) {
      case 'solid':
        material.color.set(0x1976d2);
        material.wireframe = false;
        material.transparent = false;
        material.opacity = 1.0;
        break;
      case 'wireframe':
        material.color.set(0x1976d2);
        material.wireframe = true;
        material.transparent = false;
        material.opacity = 1.0;
        break;
      case 'layer':
        material.color.set(0x1f7a6b);
        material.wireframe = false;
        material.transparent = true;
        material.opacity = 0.82;
        break;
    }
  }, [viewMode]);

  // Apply transform panel values to the mesh
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    mesh.position.set(transform.posX, basePositionYRef.current + transform.posY, transform.posZ);
    mesh.rotation.x = THREE.MathUtils.degToRad(transform.rotX) + Math.PI / 2;
    mesh.rotation.y = THREE.MathUtils.degToRad(transform.rotY) + Math.PI;
    mesh.rotation.z = THREE.MathUtils.degToRad(transform.rotZ);
    mesh.scale.setScalar(transform.scale);
    if (lockToGrid) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.min.y < 0) mesh.position.y -= box.min.y;
    }
  }, [transform, lockToGrid]);

  const resetView = () => { //helper functions 
    if (controlsRef.current && cameraRef.current && meshRef.current) {
      const box = new THREE.Box3().setFromObject(meshRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(
        center.x + maxDim * 1.5,
        center.y + maxDim * 1.5,
        center.z + maxDim * 1.5
      );
      controlsRef.current.update();
    }
  };

  const resetTransform = () => setTransform(DEFAULT_TRANSFORM);

  const updateTransform = (key: keyof Transform, value: number) =>
    setTransform(prev => ({ ...prev, [key]: value }));

  const renderTransformRow = (
    label: string, field: keyof Transform, min: number, max: number, step: number, digits = 1
  ) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="caption" sx={{ width: { xs: 24, sm: 28 }, flexShrink: 0, color: 'text.secondary' }}>{label}</Typography>
      <Slider
        size="small" min={min} max={max} step={step}
        value={transform[field]}
        onChange={(_, v) => updateTransform(field, v as number)}
        sx={{ flexGrow: 1 }}
      />
      <TextField
        size="small" type="number"
        value={Number(transform[field]).toFixed(digits)}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateTransform(field, v); }}
        inputProps={{ min, max, step, style: { padding: '4px 6px', width: 52 } }}
        sx={{ width: { xs: 68, sm: 72 }, flexShrink: 0 }}
      />
    </Box>
  );

  const viewerShell = (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: { xs: 380, sm: 460, md: 560 },
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        border: '1px solid',
        borderColor: '#dfe7f2',
        background: 'linear-gradient(180deg, #fbfdff 0%, #f1f6fc 100%)',
      }}
    >
      {loading && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2 }}>
          <Paper sx={{ px: 2.5, py: 1.5, borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: 'none' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Loading model...
            </Typography>
          </Paper>
        </Box>
      )}
      {error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, p: 2 }}>
          <Paper sx={{ px: 2.5, py: 1.5, borderRadius: 2, background: 'rgba(211, 47, 47, 0.12)', border: '1px solid rgba(211, 47, 47, 0.22)', boxShadow: 'none' }}>
            <Typography variant="body2" color="error.main" sx={{ fontWeight: 600, textAlign: 'center' }}>
              {error}
            </Typography>
          </Paper>
        </Box>
      )}
      <Box sx={{ position: 'absolute', right: 14, bottom: 14, zIndex: 1 }}>
        <Paper sx={{ px: 1.5, py: 0.75, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.92)', boxShadow: 'none', border: '1px solid #e6ebf1' }}>
          <Typography variant="caption" sx={{ color: '#526071', fontWeight: 600 }}>
            Drag to orbit · Scroll to zoom
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  const transformPanel = (
    <Paper
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        background: 'linear-gradient(180deg, #ffffff 0%, #f7faff 100%)',
        borderColor: '#e6ebf1',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
        Transform
      </Typography>
      <Divider sx={{ mb: 1.25 }} />
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Position</Typography>
      {renderTransformRow('X', 'posX', -100, 100, 0.5)}
      {renderTransformRow('Y', 'posY', -100, 100, 0.5)}
      {renderTransformRow('Z', 'posZ', -100, 100, 0.5)}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Rotation (°)</Typography>
      {renderTransformRow('RX', 'rotX', -180, 180, 1, 0)}
      {renderTransformRow('RY', 'rotY', -180, 180, 1, 0)}
      {renderTransformRow('RZ', 'rotZ', -180, 180, 1, 0)}
      <Divider sx={{ my: 1 }} />
      <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Scale</Typography>
      {renderTransformRow('S', 'scale', 0.1, 5, 0.05, 2)}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button fullWidth size="small" variant="outlined" onClick={resetView} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Reset view
        </Button>
        <Button fullWidth size="small" variant="outlined" onClick={resetTransform} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Reset transform
        </Button>
      </Stack>
      <FormControlLabel
        sx={{ mt: 1, alignItems: 'flex-start' }}
        control={<Switch size="small" checked={lockToGrid} onChange={(e) => setLockToGrid(e.target.checked)} />}
        label={<Typography variant="caption">Lock to grid</Typography>}
      />
    </Paper>
  );

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, mb: 2, animation: 'slideInUp 0.6s ease-out' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Model Viewer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Inspect geometry and adjust transforms before slicing.
        </Typography>
      </Box>

      <ButtonGroup sx={{ mb: 2 }}>
        <Button variant={viewMode === 'solid' ? 'contained' : 'outlined'} onClick={() => setViewMode('solid')} sx={{ textTransform: 'none' }}>
          Solid
        </Button>
        <Button variant={viewMode === 'wireframe' ? 'contained' : 'outlined'} onClick={() => setViewMode('wireframe')} sx={{ textTransform: 'none' }}>
          Wireframe
        </Button>
        <Button variant={viewMode === 'layer' ? 'contained' : 'outlined'} onClick={() => setViewMode('layer')} sx={{ textTransform: 'none' }}>
          Layer
        </Button>
      </ButtonGroup>

      {modelInfo && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {[
            { label: 'Width', value: `${modelInfo.dimensions.x} mm` },
            { label: 'Depth', value: `${modelInfo.dimensions.y} mm` },
            { label: 'Height', value: `${modelInfo.dimensions.z} mm` },
            { label: 'Triangles', value: Number(modelInfo.triangleCount).toLocaleString() },
          ].map((item, index) => (
            <Grid item xs={6} sm={3} key={item.label} sx={{ animation: `fadeIn 0.4s ease-out ${index * 0.08}s both` }}>
              <Paper sx={{ p: 1.25, borderRadius: 2, background: 'rgba(15, 108, 189, 0.04)', boxShadow: 'none', borderColor: '#e6ebf1' }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.35 }}>
                  {item.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          {viewerShell}
        </Grid>

        <Grid item xs={12} md={4}>
          {isMobile ? (
            <Accordion defaultExpanded sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Transform controls</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>{transformPanel}</AccordionDetails>
            </Accordion>
          ) : (
            transformPanel
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ModelViewer3D;