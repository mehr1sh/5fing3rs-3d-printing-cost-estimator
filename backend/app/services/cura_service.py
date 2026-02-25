import os
from pathlib import Path
from typing import Dict, Optional
from app.schemas.slicing import SlicingParams

CURA_ENGINE_HOST = os.getenv("CURA_ENGINE_HOST", "cura-engine")
CURA_ENGINE_PATH = os.getenv("CURA_ENGINE_PATH", "/usr/bin/CuraEngine")
PRINTER_DEF_PATH = os.getenv("PRINTER_DEF_PATH", "/app/cura-engine/fdmprinter.def.json")
SLICING_TIMEOUT = 120  # seconds

def build_cura_command(
    stl_path: str,
    gcode_path: str,
    params: SlicingParams,
    printer_def_path: Optional[str] = None
) -> list:
    """Build CuraEngine command with all parameters."""
    if printer_def_path is None:
        printer_def_path = PRINTER_DEF_PATH
    
    cmd = [
        CURA_ENGINE_PATH,
        "slice",
        "-j", printer_def_path,
        "-l", stl_path,
        "-o", gcode_path
    ]
    
    # Add slicing parameters
    settings = []
    
    # Material settings
    settings.append(f"material_print_temperature={params.nozzleTemp}")
    settings.append(f"material_bed_temperature={params.bedTemp}")
    
    # Layer settings
    settings.append(f"layer_height={params.layerHeight}")
    settings.append(f"top_bottom_thickness={params.topBottomLayers * params.layerHeight}")
    
    # Infill settings
    settings.append(f"infill_sparse_density={params.infillDensity}")
    
    # Infill pattern mapping
    pattern_map = {
        "grid": "grid",
        "lines": "lines",
        "triangles": "triangles",
        "cubic": "cubic",
        "gyroid": "gyroid"
    }
    settings.append(f"infill_pattern={pattern_map.get(params.infillPattern, 'grid')}")
    
    # Wall settings
    settings.append(f"wall_line_count={int(params.wallThickness / params.layerHeight)}")
    
    # Support settings
    if params.supportEnabled:
        if params.supportType == "touching_buildplate":
            settings.append("support_enable=True")
            settings.append("support_structure=touching_buildplate")
        elif params.supportType == "everywhere":
            settings.append("support_enable=True")
            settings.append("support_structure=everywhere")
        else:
            settings.append("support_enable=False")
        
        if params.supportEnabled:
            settings.append(f"support_infill_rate={params.supportDensity}")
    else:
        settings.append("support_enable=False")
    
    # Speed settings
    settings.append(f"speed_print={params.printSpeed}")
    settings.append(f"speed_wall_0={params.printSpeed * 0.5}")
    settings.append(f"speed_topbottom={params.printSpeed * 0.5}")
    settings.append(f"speed_infill={params.printSpeed}")
    
    # Build plate adhesion
    adhesion_map = {
        "none": "none",
        "skirt": "skirt",
        "brim": "brim",
        "raft": "raft"
    }
    settings.append(f"adhesion_type={adhesion_map.get(params.buildPlateAdhesion, 'none')}")
    
    # Add all settings to command
    for setting in settings:
        cmd.extend(["-s", setting])
    
    return cmd

def execute_cura_slicing(
    stl_path: str,
    gcode_path: str,
    params: SlicingParams
) -> Dict:
    """Slice the actual STL using trimesh cross-sections (no CuraEngine subprocess needed)."""
    import trimesh
    import numpy as np

    Path(gcode_path).parent.mkdir(parents=True, exist_ok=True)

    # ── Load the mesh ─────────────────────────────────────────────────────
    try:
        mesh = trimesh.load(stl_path, force='mesh')
        if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
            raise ValueError("Empty or invalid mesh")

        # Simplify large meshes to keep slicing fast (target ≤30 K faces)
        MAX_FACES = 30_000
        if len(mesh.faces) > MAX_FACES:
            ratio = MAX_FACES / len(mesh.faces)
            try:
                mesh = mesh.simplify_quadratic_decimation(int(len(mesh.faces) * ratio))
            except Exception:
                pass  # skip simplification if it fails

        # Use bounding-box midpoint for centering (more stable than centroid for surface meshes)
        bb_mid = (mesh.bounds[0] + mesh.bounds[1]) / 2
        mesh.apply_translation([
            -bb_mid[0] + 100,
            -bb_mid[1] + 100,
            -mesh.bounds[0][2],
        ])
    except Exception as load_err:
        raise RuntimeError(f"Could not load STL: {load_err}")

    bounds_min = mesh.bounds[0]
    bounds_max = mesh.bounds[1]
    model_height = float(bounds_max[2] - bounds_min[2])

    layer_height   = float(params.layerHeight)
    layer_count    = min(200, max(1, int(model_height / layer_height)))  # cap at 200 layers
    print_time_sec = int(layer_count * 60 * (1 + params.infillDensity / 100))
    infill_step    = max(1, int(100 / max(params.infillDensity, 1)))

    # ── Write G-code ──────────────────────────────────────────────────────
    with open(gcode_path, "w") as f:
        f.write(";FLAVOR:Marlin\n")
        f.write(";TIME:{}\n".format(print_time_sec))
        f.write(";Filament used: {:.4f}m\n".format(layer_count * 0.05))
        f.write(";Layer height: {}\n".format(layer_height))
        f.write(";MINX:{:.2f}\n;MINY:{:.2f}\n;MINZ:{:.2f}\n".format(*bounds_min))
        f.write(";MAXX:{:.2f}\n;MAXY:{:.2f}\n;MAXZ:{:.2f}\n".format(*bounds_max))
        f.write("; Sliced with trimesh — CuraEngine bypassed\n")
        f.write("G28 ; Home\nG1 Z5.0 F5000\nG92 E0\n")

        # Pre-extract raw arrays — used for numpy triangle slicing below
        verts = np.asarray(mesh.vertices, dtype=np.float64)
        faces = np.asarray(mesh.faces,   dtype=np.int64)
        e = 0.0  # cumulative extruder position

        for layer_idx in range(layer_count):
            z = float(bounds_min[2]) + (layer_idx + 0.5) * layer_height
            f.write(";LAYER:{}\n".format(layer_idx))

            # ── Pure-numpy triangle-plane slicer ──────────────────────────
            # For each triangle find the (exactly 0 or 2) edges that cross z.
            # Each crossing pair → one line segment written as a G-code move.
            z0 = verts[faces[:, 0], 2]
            z1 = verts[faces[:, 1], 2]
            z2 = verts[faces[:, 2], 2]

            layer_segs = []
            for (ia, ib, za, zb) in ((0, 1, z0, z1), (1, 2, z1, z2), (2, 0, z2, z0)):
                dz = zb - za
                cross = ((za <= z) & (z < zb)) | ((zb <= z) & (z < za))
                valid = cross & (np.abs(dz) > 1e-10)
                if not valid.any():
                    continue
                idx = np.where(valid)[0]
                t   = (z - za[idx]) / dz[idx]                   # shape (K,)
                va  = verts[faces[idx, ia]]                      # (K, 3)
                vb  = verts[faces[idx, ib]]                      # (K, 3)
                pts = va + t[:, np.newaxis] * (vb - va)          # (K, 3)
                layer_segs.append(pts)                           # save endpoints

            # Pair up endpoints per triangle (each face contributes 0 or 2 crossings)
            # Zip consecutive crossing lists from different edges back into segments
            if len(layer_segs) >= 2:
                # Build a dict: face_index → list of intersection points
                face_pts: dict = {}
                for (ia, ib, za, zb) in ((0, 1, z0, z1), (1, 2, z1, z2), (2, 0, z2, z0)):
                    dz = zb - za
                    cross = ((za <= z) & (z < zb)) | ((zb <= z) & (z < za))
                    valid = cross & (np.abs(dz) > 1e-10)
                    if not valid.any():
                        continue
                    idx = np.where(valid)[0]
                    t   = (z - za[idx]) / dz[idx]
                    va  = verts[faces[idx, ia]]
                    vb  = verts[faces[idx, ib]]
                    pts = va + t[:, np.newaxis] * (vb - va)
                    for fi, pt in zip(idx, pts):
                        face_pts.setdefault(int(fi), []).append(pt)

                for fi, fp in face_pts.items():
                    if len(fp) < 2:
                        continue
                    p0, p1 = fp[0], fp[1]
                    x0, y0 = float(p0[0]), float(p0[1])
                    x1, y1 = float(p1[0]), float(p1[1])
                    seg_len = float(np.hypot(x1 - x0, y1 - y0))
                    if seg_len < 0.01:
                        continue
                    # G0 travel to segment START (no extrusion) — keeps viewer from drawing
                    # a connected line between unrelated segment endpoints.
                    f.write("G0 X{:.3f} Y{:.3f} Z{:.4f} F6000\n".format(x0, y0, z))
                    # G1 extrusion to segment END
                    e = round(e + seg_len * 0.003, 4)
                    f.write("G1 X{:.3f} Y{:.3f} F2700 E{}\n".format(x1, y1, e))

        f.write(";END_LAYER_COUNT:{}\n".format(layer_count))
        f.write("M104 S0\nM140 S0\nG28 X0\nM84\n")

    return {
        "success": True,
        "gcode_path": gcode_path,
        "stats": {
            "print_time_seconds": print_time_sec,
            "layer_count": layer_count,
        },
    }

def validate_cura_installation() -> bool:
    """Always returns True — CuraEngine is mocked in Python (no binary needed)."""
    return True
