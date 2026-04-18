import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box, ButtonGroup, Button, Typography, Paper,
  Slider, TextField, Grid, Divider, FormControlLabel, Switch,
  Accordion, AccordionSummary, AccordionDetails, Stack, useMediaQuery,
  IconButton, Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded';
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';

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
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clippingValue, setClippingValue] = useState(100); // 0-100 percentage
  const [showClipping, setShowClipping] = useState(false);

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
      5000 // Increased far plane to avoid clipping large models
    );
    camera.position.set(200, 200, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true; // Enable local clipping
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
    console.log('Starting STL load from:', modelUrl);
    const loader = new STLLoader();
    loader.load(
      modelUrl,
      (geometry) => {
        console.log('STL loaded successfully. Geometry:', geometry);

        if (!geometry.attributes.position || geometry.attributes.position.count === 0) {
          console.error('Loaded geometry is empty');
          setError('The loaded 3D model appears to be empty.');
          setLoading(false);
          return;
        }

        geometry.center();
        geometry.computeVertexNormals();
        currentGeometry = geometry;

        const material = new THREE.MeshStandardMaterial({
          color: 0x1976d2,
          flatShading: false,
          metalness: 0.1,
          roughness: 0.65,
          clippingPlanes: [clippingPlaneRef.current],
          clipShadows: true,
          side: THREE.DoubleSide,
        });
        currentMaterial = material;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Fix orientation - Most STLs are Z-up, Three.js is Y-up
        mesh.rotation.x = -Math.PI / 2;

        scene.add(mesh);
        meshRef.current = mesh;

        // Step 1: Get bounding box BEFORE any position adjustment
        const box = new THREE.Box3().setFromObject(mesh);
        console.log('Model Bounding Box:', box);

        // Step 2: Center the mesh on X and Z axes
        const centerXZ = box.getCenter(new THREE.Vector3());
        mesh.position.x -= centerXZ.x;
        mesh.position.z -= centerXZ.z;

        // Step 3: Lift mesh so its bottom sits on the grid (y=0)
        box.setFromObject(mesh); // Update box after XZ shift
        mesh.position.y -= box.min.y;
        basePositionYRef.current = mesh.position.y;

        setTransform(DEFAULT_TRANSFORM);

        // Step 4: Recalculate final stats
        box.setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log('Final Size:', size, 'Center:', center);

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

        // Step 5: Point camera at the model
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraDistance = maxDim * 2.5;

        controls.target.copy(center);
        camera.position.set(
          center.x + cameraDistance,
          center.y + cameraDistance,
          center.z + cameraDistance
        );
        camera.lookAt(center);
        controls.update();

        // Initialize clipping plane to top of model
        clippingPlaneRef.current.constant = size.y;

        setLoading(false);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log(`STL loading progress: ${Math.round(percentComplete)}%`);
        }
      },
      (err) => {
        console.error('STLLoader error:', err);
        setError('Failed to display 3D model. Please try refreshing or re-uploading.');
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

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Force resize on fullscreen change
      setTimeout(handleResize, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => { // cleanup on model change, cancel animatin frame, etc.
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        setShowClipping(false);
        break;
      case 'wireframe':
        material.color.set(0x1976d2);
        material.wireframe = true;
        material.transparent = false;
        material.opacity = 1.0;
        setShowClipping(false);
        break;
      case 'layer':
        material.color.set(0x1f7a6b);
        material.wireframe = false;
        material.transparent = true;
        material.opacity = 0.82;
        setShowClipping(true);
        break;
    }
  }, [viewMode]);

  // Apply transform panel values to the mesh
  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    mesh.position.set(transform.posX, basePositionYRef.current + transform.posY, transform.posZ);
    mesh.rotation.x = THREE.MathUtils.degToRad(transform.rotX) - Math.PI / 2;
    mesh.rotation.y = THREE.MathUtils.degToRad(transform.rotY);
    mesh.rotation.z = THREE.MathUtils.degToRad(transform.rotZ);
    mesh.scale.setScalar(transform.scale);
    if (lockToGrid) {
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.min.y < 0) mesh.position.y -= box.min.y;
    }
  }, [transform, lockToGrid]);

  // Update clipping plane position
  useEffect(() => {
    if (!modelInfo || !showClipping) {
      clippingPlaneRef.current.constant = 10000; // Move far away if disabled
      return;
    }
    const height = parseFloat(modelInfo.dimensions.y);
    clippingPlaneRef.current.constant = (height * (clippingValue / 100));
  }, [clippingValue, modelInfo, showClipping]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const resetView = () => { //helper functions 
    if (controlsRef.current && cameraRef.current && meshRef.current) {
      const box = new THREE.Box3().setFromObject(meshRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(
        center.x + maxDim * 2.5,
        center.y + maxDim * 2.5,
        center.z + maxDim * 2.5
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
        height: isFullscreen ? '100vh' : { xs: 380, sm: 460, md: 560 },
        borderRadius: isFullscreen ? 0 : 2,
        overflow: 'hidden',
        position: 'relative',
        border: isFullscreen ? 'none' : '1px solid',
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

      {/* Viewer Overlay Controls */}
      <Box sx={{ position: 'absolute', top: 14, right: 14, zIndex: 5, display: 'flex', gap: 1 }}>
        <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
          <IconButton
            onClick={toggleFullscreen}
            sx={{
              bgcolor: 'rgba(255,255,255,0.9)',
              '&:hover': { bgcolor: '#fff' },
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {isFullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ position: 'absolute', left: 14, bottom: 14, zIndex: 1 }}>
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
        Tools & Transform
      </Typography>
      <Divider sx={{ mb: 1.25 }} />

      {/* Layer Selection Section */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <LayersRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Layer Clipping
          </Typography>
        </Stack>
        <FormControlLabel
          control={<Switch size="small" checked={showClipping} onChange={(e) => setShowClipping(e.target.checked)} />}
          label={<Typography variant="caption">Enable layer view</Typography>}
          sx={{ mb: 1 }}
        />
        <Box sx={{ px: 1 }}>
          <Typography variant="caption" color="text.secondary">Current Height (%)</Typography>
          <Slider
            disabled={!showClipping}
            value={clippingValue}
            onChange={(_, v) => setClippingValue(v as number)}
            min={0}
            max={100}
            size="small"
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

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