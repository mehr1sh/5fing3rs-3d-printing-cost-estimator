import os
import re
from typing import Tuple, Optional
from pathlib import Path

ALLOWED_EXTENSIONS = {".stl", ".step", ".stp"}
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

def validate_file_integrity(file_path: str, extension: str) -> Tuple[bool, Optional[str]]:
    """Validate file integrity based on extension."""
    ext = extension.lower()
    if ext == ".stl":
        return validate_stl_file(file_path)
    elif ext in [".step", ".stp"]:
        return validate_step_file(file_path)
    return False, "Unsupported file type for validation"
