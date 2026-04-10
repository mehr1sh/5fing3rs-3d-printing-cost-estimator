import re
from typing import Dict, List, Tuple, Optional
from pathlib import Path

def parse_gcode(gcode_path: str) -> Dict:
    """Parse G-code file and extract statistics."""
    try:
        with open(gcode_path, 'r') as f:
            content = f.read()
        
        # Extract layer count
        layer_matches = re.findall(r';LAYER:(\d+)', content, re.IGNORECASE)
        layer_count = len(set(layer_matches)) if layer_matches else 0
        
        # Extract print time
        time_match = re.search(r';TIME:(\d+)', content, re.IGNORECASE)
        print_time_seconds = int(time_match.group(1)) if time_match else 0
        
        # Calculate material usage from E (extrusion) values
        material_volume_mm3 = calculate_material_volume(content)
        
        # Extract all G1 commands for visualization
        g1_commands = extract_g1_commands(content)
        
        return {
            "layer_count": layer_count,
            "print_time_seconds": print_time_seconds,
            "material_volume_mm3": material_volume_mm3,
            "g1_commands": g1_commands
        }
    except Exception as e:
        raise ValueError(f"Error parsing G-code: {str(e)}")

def calculate_material_volume(content: str) -> float:
    """Calculate material volume from E (extrusion) values."""
    # Extract all E values from G1 commands
    e_values = []
    last_e = 0.0
    
    for line in content.split('\n'):
        if line.strip().startswith('G1'):
            e_match = re.search(r'E([\d.]+)', line)
            if e_match:
                e_value = float(e_match.group(1))
                if e_value > last_e:
                    e_values.append(e_value - last_e)
                    last_e = e_value
    
    # Estimate volume (simplified - assumes 0.4mm nozzle, 0.2mm layer height)
    # E value is typically in mm of filament
    # Volume = π * (filament_diameter/2)^2 * E_length
    filament_diameter = 1.75  # mm (standard)
    total_e = sum(e_values)
    volume_mm3 = 3.14159 * (filament_diameter / 2) ** 2 * total_e
    
    return volume_mm3

def extract_g1_commands(content: str) -> List[Dict]:
    """Extract G1 (linear move) commands for visualization."""
    commands = []
    current_layer = 0
    last_x, last_y, last_z, last_e = 0.0, 0.0, 0.0, 0.0
    
    for line in content.split('\n'):
        line = line.strip()
        
        # Check for layer change
        layer_match = re.search(r';LAYER:(\d+)', line, re.IGNORECASE)
        if layer_match:
            current_layer = int(layer_match.group(1))
            continue
        
        # Parse G1 command
        if line.startswith('G1') or line.startswith('G0'):
            x_match = re.search(r'X([\d.]+)', line)
            y_match = re.search(r'Y([\d.]+)', line)
            z_match = re.search(r'Z([\d.]+)', line)
            e_match = re.search(r'E([\d.]+)', line)
            
            x = float(x_match.group(1)) if x_match else last_x
            y = float(y_match.group(1)) if y_match else last_y
            z = float(z_match.group(1)) if z_match else last_z
            e = float(e_match.group(1)) if e_match else last_e
            
            is_extrusion = e > last_e if e_match else False
            
            commands.append({
                "layer": current_layer,
                "x": x,
                "y": y,
                "z": z,
                "e": e,
                "is_extrusion": is_extrusion,
                "from": {"x": last_x, "y": last_y, "z": last_z},
                "to": {"x": x, "y": y, "z": z}
            })
            
            last_x, last_y, last_z, last_e = x, y, z, e
    
    return commands

def get_layer_ranges(gcode_path: str) -> List[Tuple[int, int]]:
    """Get line number ranges for each layer."""
    layer_ranges = []
    current_layer = -1
    layer_start = 0
    
    with open(gcode_path, 'r') as f:
        for line_num, line in enumerate(f):
            layer_match = re.search(r';LAYER:(\d+)', line, re.IGNORECASE)
            if layer_match:
                if current_layer >= 0:
                    layer_ranges.append((current_layer, layer_start, line_num - 1))
                current_layer = int(layer_match.group(1))
                layer_start = line_num
        
        # Add last layer
        if current_layer >= 0:
            layer_ranges.append((current_layer, layer_start, line_num))
    
    return layer_ranges
