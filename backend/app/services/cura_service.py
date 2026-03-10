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
    """Build CuraEngine command with all parameters.
    
    Verified working order:
      CuraEngine slice -j def.json -o output.gcode -s setting=val ... -l model.stl
    """
    if printer_def_path is None:
        printer_def_path = PRINTER_DEF_PATH
    
    # Start with binary, verb, definition file, and output file
    cmd = [
        CURA_ENGINE_PATH,
        "slice",
        "-j", printer_def_path,
        "-o", gcode_path,
    ]
    
    # Build list of global settings (applied before loading the model)
    settings = []
    
    # Material settings (NOTE: overriding nozzle/bed temperature causes an infinite loop
    # in Cura 5.0 fdmprinter definitions! DO NOT add material_print_temperature here)
    
    # Required shrinkages for CuraEngine 5.x fdmprinter.def.json
    settings.append("material_shrinkage_percentage_xy=100")
    settings.append("material_shrinkage_percentage_z=100")
    
    # Layer settings
    settings.append(f"layer_height={params.layerHeight}")
    settings.append(f"top_bottom_thickness={params.topBottomLayers * params.layerHeight}")
    
    # Infill settings
    settings.append(f"infill_sparse_density={params.infillDensity}")
    pattern_map = {
        "grid": "grid", "lines": "lines", "triangles": "triangles",
        "cubic": "cubic", "gyroid": "gyroid"
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
        settings.append(f"support_infill_rate={params.supportDensity}")
    else:
        settings.append("support_enable=False")
    
    # Speed settings
    settings.append(f"speed_print={params.printSpeed}")
    settings.append(f"speed_wall_0={params.printSpeed * 0.5}")
    settings.append(f"speed_topbottom={params.printSpeed * 0.5}")
    settings.append(f"speed_infill={params.printSpeed}")
    
    # Build plate adhesion — default to none to avoid raft/brim
    adhesion_map = {"none": "none", "skirt": "skirt", "brim": "brim", "raft": "raft"}
    settings.append(f"adhesion_type={adhesion_map.get(params.buildPlateAdhesion, 'none')}")
    
    # Append all settings flags
    for setting in settings:
        cmd.extend(["-s", setting])
    
    # Finally load the model — MUST come after all -s global flags
    cmd.extend(["-l", stl_path])
    
    return cmd

def execute_cura_slicing(
    stl_path: str,
    gcode_path: str,
    params: SlicingParams
) -> Dict:
    """Slice the actual STL using Ultimaker CuraEngine via subprocess."""
    import subprocess
    import re
    
    Path(gcode_path).parent.mkdir(parents=True, exist_ok=True)
    cmd = build_cura_command(stl_path, gcode_path, params)
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=SLICING_TIMEOUT)
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"CuraEngine failed: {e.stderr}")
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"Slicing timed out after {SLICING_TIMEOUT} seconds")

    print_time_seconds = 0
    layer_count = 0
    filament_used_m = 0.0
    
    if os.path.exists(gcode_path):
        with open(gcode_path, 'r') as f:
            content = f.read()
            time_match = re.search(r';TIME:(\d+)', content)
            if time_match:
                print_time_seconds = int(time_match.group(1))
            
            layer_count = len(re.findall(r';LAYER:\d+', content))
            if layer_count == 0:
                layer_count = len(re.findall(r';LAYER:', content))
            
            fil_match = re.search(r';Filament used: ([\d.]+)m', content)
            if fil_match:
                filament_used_m = float(fil_match.group(1))

    return {
        "success": True,
        "gcode_path": gcode_path,
        "stats": {
            "print_time_seconds": print_time_seconds,
            "layer_count": layer_count,
            "filament_used_m": filament_used_m
        },
    }

def validate_cura_installation() -> bool:
    """Verify CuraEngine is available and executable."""
    import subprocess
    try:
        result = subprocess.run([CURA_ENGINE_PATH, "help"], capture_output=True, text=True)
        return "CuraEngine" in result.stdout or "CuraEngine" in result.stderr
    except (subprocess.SubprocessError, FileNotFoundError):
        return False
