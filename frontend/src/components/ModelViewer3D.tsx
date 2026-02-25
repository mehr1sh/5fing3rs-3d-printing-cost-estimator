import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, ButtonGroup, Button, Typography, Paper } from '@mui/material';

interface ModelViewer3DProps {
  modelUrl: string;
  jobId: string;
}

type ViewMode = 'solid' | 'wireframe' | 'xray' | 'layer';

const ModelViewer3D: React.FC<ModelViewer3DProps> = ({ modelUrl, jobId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('solid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid helper (build plate)
    const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc);
    scene.add(gridHelper);

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
          color: 0x00aaff,
          flatShading: false,
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
        mesh.rotation.x = Math.PI/2; // 180° around X (fixes upside-down)
        mesh.rotation.y = Math.PI; // 180° around Y (fixes backwards)
        // If this doesn't work, try:
        // mesh.rotation.x = 0; mesh.rotation.y = 0; // No rotation
        // mesh.rotation.x = Math.PI; mesh.rotation.y = 0; // Only X rotation
        // mesh.rotation.x = 0; mesh.rotation.y = Math.PI; // Only Y rotation
        // mesh.rotation.z = Math.PI / 2; // 90° Z rotation for sideways
        
        scene.add(mesh);
        meshRef.current = mesh;

        // Calculate bounding box and info
        const box = new THREE.Box3().setFromObject(mesh);
        mesh.position.y = mesh.position.y - box.min.y;
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

        // Center camera on model
        controls.target.copy(center);
        camera.position.set(
          center.x + size.x,
          center.y + size.y,
          center.z + size.z
        );
        camera.lookAt(center);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        setError('Failed to load model: ' + err);
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

    return () => {
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
        material.wireframe = false;
        material.transparent = false;
        material.opacity = 1.0;
        break;
      case 'wireframe':
        material.wireframe = true;
        material.transparent = false;
        material.opacity = 1.0;
        break;
      case 'xray':
        material.wireframe = false;
        material.transparent = true;
        material.opacity = 0.3;
        break;
      case 'layer':
        material.wireframe = false;
        material.transparent = false;
        material.opacity = 1.0;
        break;
    }
  }, [viewMode]);

  const resetView = () => {
    if (controlsRef.current && cameraRef.current && meshRef.current) {
      const box = new THREE.Box3().setFromObject(meshRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      controlsRef.current.target.copy(center);
      cameraRef.current.position.set(
        center.x + size.x,
        center.y + size.y,
        center.z + size.z
      );
      controlsRef.current.update();
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <ButtonGroup sx={{ mb: 2 }}>
          <Button
            variant={viewMode === 'solid' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('solid')}
          >
            Solid
          </Button>
          <Button
            variant={viewMode === 'wireframe' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('wireframe')}
          >
            Wireframe
          </Button>
          <Button
            variant={viewMode === 'xray' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('xray')}
          >
            X-Ray
          </Button>
          <Button variant="outlined" onClick={resetView}>
            Reset View
          </Button>
        </ButtonGroup>

        {modelInfo && (
          <Box>
            <Typography variant="body2">
              <strong>Dimensions:</strong> {modelInfo.dimensions.x} × {modelInfo.dimensions.y} ×{' '}
              {modelInfo.dimensions.z} mm
            </Typography>
            <Typography variant="body2">
              <strong>Triangles:</strong> {modelInfo.triangleCount.toLocaleString()}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '600px',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <Typography>Loading model...</Typography>
          </Box>
        )}
        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'error.main',
            }}
          >
            <Typography>{error}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ModelViewer3D;
