import os
import re
from typing import Tuple, Optional
from pathlib import Path

ALLOWED_EXTENSIONS = {".stl", ".step", ".stp", ".obj", ".3mf", ".ply"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_file_extension(filename: str) -> bool:
    """Validate file has allowed extension."""
    ext = Path(filename).suffix.lower()
    return ext in ALLOWED_EXTENSIONS

def validate_file_size(file_size: int) -> bool:
    """Validate file size is within limits."""
    return file_size > 0 and file_size <= MAX_FILE_SIZE

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal."""
    # Remove path separators and dangerous characters
    filename = os.path.basename(filename)
    # Remove any remaining dangerous characters
    filename = re.sub(r'[<>:"|?*]', '', filename)
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:250] + ext
    return filename

def validate_stl_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate STL file integrity."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(80)
            # Check if it's ASCII STL
            if header.startswith(b'solid'):
                # ASCII STL - check for valid structure
                f.seek(0)
                content = f.read(1024).decode('ascii', errors='ignore')
                if 'facet normal' in content or 'vertex' in content:
                    return True, None
            else:
                # Binary STL - check for valid header and triangle count
                f.seek(80)
                triangle_count_bytes = f.read(4)
                if len(triangle_count_bytes) == 4:
                    # Valid binary STL structure
                    return True, None
        return False, "Invalid STL file format"
    except Exception as e:
        return False, f"Error validating STL file: {str(e)}"

def validate_step_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate STEP file integrity."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(200)
            # STEP files typically start with ISO-10303-21 or similar
            if b'ISO-10303-21' in header or b'STEP' in header.upper():
                return True, None
        return False, "Invalid STEP file format"
    except Exception as e:
        return False, f"Error validating STEP file: {str(e)}"

def validate_obj_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate OBJ file integrity."""
    try:
        with open(file_path, 'rb') as f:
            content = f.read(512).decode('ascii', errors='ignore')
            if any(line.startswith(('v ', 'vn ', 'vt ', 'f ', 'o ', 'g ', '#')) for line in content.splitlines()):
                return True, None
        return False, "Invalid OBJ file format"
    except Exception as e:
        return False, f"Error validating OBJ file: {str(e)}"


def validate_3mf_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate 3MF file integrity (3MF is a ZIP archive)."""
    try:
        import zipfile
        if zipfile.is_zipfile(file_path):
            with zipfile.ZipFile(file_path, 'r') as z:
                names = z.namelist()
                if any('3dmodel.model' in n or n.endswith('.model') for n in names):
                    return True, None
        return False, "Invalid 3MF file format"
    except Exception as e:
        return False, f"Error validating 3MF file: {str(e)}"


def validate_ply_file(file_path: str) -> Tuple[bool, Optional[str]]:
    """Validate PLY file integrity."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(4)
            if header == b'ply\n' or header.startswith(b'ply'):
                return True, None
        return False, "Invalid PLY file format"
    except Exception as e:
        return False, f"Error validating PLY file: {str(e)}"


def validate_file_integrity(file_path: str, extension: str) -> Tuple[bool, Optional[str]]:
    """Validate file integrity based on extension."""
    ext = extension.lower()
    if ext == ".stl":
        return validate_stl_file(file_path)
    elif ext in (".step", ".stp"):
        return validate_step_file(file_path)
    elif ext == ".obj":
        return validate_obj_file(file_path)
    elif ext == ".3mf":
        return validate_3mf_file(file_path)
    elif ext == ".ply":
        return validate_ply_file(file_path)
    return False, "Unsupported file type for validation"

def extract_stl_bounds(file_path: str) -> Tuple[Optional[dict], Optional[str]]:
    """Extract min/max bounds from STL file.
    
    Returns:
        tuple: (bounds_dict, error_message)
        bounds_dict example: {"min_x": 0, "max_x": 10, ...}
    """
    import struct
    try:
        min_coords = [float('inf'), float('inf'), float('inf')]
        max_coords = [float('-inf'), float('-inf'), float('-inf')]
        
        with open(file_path, 'rb') as f:
            header = f.read(80)
            if header.startswith(b'solid') and b'facet' in f.read(200):
                # Probable ASCII STL
                f.seek(0)
                for line in f:
                    line = line.decode('ascii', errors='ignore').strip().lower()
                    if line.startswith('vertex'):
                        parts = line.split()
                        if len(parts) >= 4:
                            for i in range(3):
                                val = float(parts[i+1])
                                if val < min_coords[i]: min_coords[i] = val
                                if val > max_coords[i]: max_coords[i] = val
            else:
                # Binary STL
                f.seek(80)
                count_bytes = f.read(4)
                if len(count_bytes) < 4:
                    return None, "Truncated binary STL"
                
                num_triangles = struct.unpack('<I', count_bytes)[0]
                # Each triangle is 50 bytes (normal[12] + v1[12] + v2[12] + v3[12] + attr[2])
                for _ in range(num_triangles):
                    data = f.read(50)
                    if len(data) < 50:
                        break
                    # We only care about vertices (v1, v2, v3) which start at offset 12
                    # Each vertex is 3 floats (12 bytes)
                    for v_idx in range(3):
                        offset = 12 + (v_idx * 12)
                        v_coords = struct.unpack('<3f', data[offset:offset+12])
                        for i in range(3):
                            if v_coords[i] < min_coords[i]: min_coords[i] = v_coords[i]
                            if v_coords[i] > max_coords[i]: max_coords[i] = v_coords[i]
                            
        if min_coords[0] == float('inf'):
            return None, "No geometry found in STL"
            
        return {
            "min_x": min_coords[0], "max_x": max_coords[0], "size_x": max_coords[0] - min_coords[0],
            "min_y": min_coords[1], "max_y": max_coords[1], "size_y": max_coords[1] - min_coords[1],
            "min_z": min_coords[2], "max_z": max_coords[2], "size_z": max_coords[2] - min_coords[2],
        }, None
    except Exception as e:
        return None, f"Error parsing STL bounds: {str(e)}"
