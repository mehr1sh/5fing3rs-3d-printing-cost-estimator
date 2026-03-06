import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  ButtonGroup,
  CircularProgress,
} from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface GCodePreviewProps {
  gcodeUrl: string;
}

const GCodePreview: React.FC<GCodePreviewProps> = ({ gcodeUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const controlsRef = useRef<OrbitControls | null>(null);
  const resizeRef = useRef<(() => void) | null>(null);
  const layersRef = useRef<THREE.LineSegments[]>([]);

  const [currentLayer, setCurrentLayer] = useState(0);
  const [totalLayers, setTotalLayers] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);

  // ── Main scene setup + G-code load ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !gcodeUrl) return;

    // --- tear down any previous scene ---
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (controlsRef.current) { controlsRef.current.dispose(); controlsRef.current = null; }
    if (resizeRef.current) window.removeEventListener('resize', resizeRef.current);
    if (rendererRef.current) {
      if (rendererRef.current.domElement.parentNode === containerRef.current)
        containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    layersRef.current = [];
    setTotalLayers(0);
    setCurrentLayer(0);
    setLoading(true);

    // --- scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.add(new THREE.GridHelper(400, 40, 0x444444, 0x333333));

    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 5000);
    camera.position.set(0, 150, 300);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // --- animation loop ---
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- resize ---
    const onResize = () => {
      if (!containerRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = containerRef.current.clientHeight || 500;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);
    resizeRef.current = onResize;

    // --- fetch G-code ---
    const token = localStorage.getItem('access_token');
    let cancelled = false;

    fetch(gcodeUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(gcode => {
        if (cancelled) return;

        // ── Parse G-code into per-layer arrays of [x0,y0,z0, x1,y1,z1, …]
        //    We map  gcodeX → threeX,  gcodeZ → threeY,  gcodeY → three(-Z)
        const lines = gcode.split('\n');
        const tmpPoints: number[][] = [];          // tmpPoints[layerIdx] = [x0,y0,z0,x1,y1,z1,…]

        let curLayer = -1;
        let lx = 0, ly = 0, lz = 0, le = 0;

        // bounding box for camera targeting
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;

          if (line.includes('LAYER:')) {
            const m = line.match(/LAYER:(\d+)/);
            if (m) {
              curLayer = parseInt(m[1]);
              while (tmpPoints.length <= curLayer) tmpPoints.push([]);
            }
            continue;
          }

          if ((line.startsWith('G1') || line.startsWith('G0')) && curLayer >= 0) {
            const xm = line.match(/X([\d.-]+)/);
            const ym = line.match(/Y([\d.-]+)/);
            const zm = line.match(/Z([\d.-]+)/);
            const em = line.match(/E([\d.-]+)/);

            if (xm || ym || zm) {
              const x = xm ? parseFloat(xm[1]) : lx;
              const y = ym ? parseFloat(ym[1]) : ly;
              const z = zm ? parseFloat(zm[1]) : lz;
              const e = em ? parseFloat(em[1]) : le;

              // Only draw if extruding (E increased)
              if (em && e > le) {
                // map: gcodeX→X, gcodeZ→Y(up), gcodeY→-Z
                const p0 = [lx, lz, -ly];
                const p1 = [x, z, -y];
                tmpPoints[curLayer].push(...p0, ...p1);

                // update bbox
                for (const px of [p0[0], p1[0]]) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); }
                for (const py of [p0[1], p1[1]]) { minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
                for (const pz of [p0[2], p1[2]]) { minZ = Math.min(minZ, pz); maxZ = Math.max(maxZ, pz); }
              }
              lx = x; ly = y; lz = z; le = e;
            }
          }
        }

        // ── Centre the model on the grid origin ─────────────────────────
        // The slicer offsets the model to X=100,Y=100 on the printer bed,
        // so we subtract the bounding box centre from every point so that
        // the print sits at (0, 0) — the centre of the grid helper.
        // Only centre on X and Z (horizontal axes) — do NOT offset Y (height)
        // so the model sits ON TOP of the grid, not inside it
        const offsetX = isFinite(minX) ? (minX + maxX) / 2 : 0;
        const offsetZ = isFinite(minZ) ? (minZ + maxZ) / 2 : 0;
        // Shift Y so the bottom of the model sits exactly on the grid (y=0)
        const offsetY = isFinite(minY) ? minY : 0;

        for (const pts of tmpPoints) {
          for (let i = 0; i < pts.length; i += 3) {
            pts[i]     -= offsetX;
            pts[i + 1] -= offsetY;
            pts[i + 2] -= offsetZ;
          }
        }

        // Recentre bbox values too (used for camera targeting below)
        minX -= offsetX; maxX -= offsetX;
        minY -= offsetY; maxY -= offsetY;
        minZ -= offsetZ; maxZ -= offsetZ;

        // ── Build Three.js objects — ONE LineSegments per layer ──────────
        const numLayers = tmpPoints.length;
        const layerSegs: THREE.LineSegments[] = [];

        for (let li = 0; li < numLayers; li++) {
          const pts = tmpPoints[li];
          if (!pts || pts.length < 6) { layerSegs.push(new THREE.LineSegments()); continue; }

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));

          // Color: blue (bottom layer) → red (top layer) — matches real slicers
          const hue = numLayers > 1 ? (1 - li / (numLayers - 1)) * 0.67 : 0;
          const mat = new THREE.LineBasicMaterial({
            color: new THREE.Color().setHSL(hue, 1, 0.55),
          });

          const ls = new THREE.LineSegments(geo, mat);
          ls.visible = true;
          scene.add(ls);
          layerSegs.push(ls);
        }

        layersRef.current = layerSegs;
        setTotalLayers(numLayers);
        setCurrentLayer(numLayers > 0 ? numLayers - 1 : 0);
        setLoading(false);

        // ── Point camera at the model centroid ───────────────────────────
        if (isFinite(minX) && isFinite(maxX)) {
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;
          const diag = Math.sqrt(
            (maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2
          );
          const dist = Math.max(diag * 1.2, 50);  // maintain minimum distance
          controls.target.set(cx, cy, cz);
          camera.position.set(cx + dist * 0.5, cy + dist * 0.5, cz + dist * 0.8);
          camera.lookAt(cx, cy, cz);  // CRITICAL: orient camera toward target
          controls.update();
        }
      })
      .catch(err => {
        if (!cancelled) { console.error('GCode load error:', err); setLoading(false); }
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resizeRef.current!);
      controlsRef.current?.dispose();
      if (rendererRef.current?.domElement.parentNode === containerRef.current)
        containerRef.current?.removeChild(rendererRef.current!.domElement);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [gcodeUrl]);

  // ── Layer slider → show/hide layers ────────────────────────────────────
  useEffect(() => {
    layersRef.current.forEach((ls, i) => { ls.visible = i <= currentLayer; });
  }, [currentLayer]);

  // ── Playback ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || totalLayers === 0) return;
    const id = setInterval(() => {
      setCurrentLayer(prev => {
        if (prev >= totalLayers - 1) { setPlaying(false); return prev; }
        return Math.min(prev + speed, totalLayers - 1);
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed, totalLayers]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>G-code Preview</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Loading G-code…</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                Layer {Math.floor(currentLayer)} / {Math.max(0, totalLayers - 1)}
              </Typography>
              <Slider
                value={currentLayer}
                min={0}
                max={Math.max(0, totalLayers - 1)}
                step={1}
                onChange={(_, v) => setCurrentLayer(v as number)}
                sx={{ mt: 1 }}
                disabled={totalLayers === 0}
              />
            </Box>
            <ButtonGroup size="small">
              <Button onClick={() => setPlaying(p => !p)} disabled={totalLayers === 0}>
                {playing ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={() => { setPlaying(false); setCurrentLayer(0); }}>Reset</Button>
              <Button onClick={() => setCurrentLayer(totalLayers - 1)} disabled={totalLayers === 0}>All</Button>
              {[1, 2, 5].map(s => (
                <Button key={s} variant={speed === s ? 'contained' : 'outlined'}
                  onClick={() => setSpeed(s)}>{s}x</Button>
              ))}
            </ButtonGroup>
          </>
        )}
      </Paper>
      <Box ref={containerRef} sx={{
        width: '100%', height: '500px',
        border: '1px solid', borderColor: 'divider',
        borderRadius: 1, overflow: 'hidden', bgcolor: '#1a1a1a',
      }} />
    </Box>
  );
};

export default GCodePreview;
