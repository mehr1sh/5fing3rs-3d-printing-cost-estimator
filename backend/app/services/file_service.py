import os
import uuid
import aiofiles
from pathlib import Path
from typing import Tuple, Optional
from fastapi import UploadFile
from app.utils.validators import (
    validate_file_extension,
    validate_file_size,
    sanitize_filename,
    validate_file_integrity
)

UPLOAD_DIR = Path("/app/uploads")
GCODE_DIR = Path("/app/gcode")

def ensure_directories():
    """Ensure upload and gcode directories exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    GCODE_DIR.mkdir(parents=True, exist_ok=True)

async def save_uploaded_file(file: UploadFile, job_id: uuid.UUID) -> Tuple[str, str, int]:
    """Save uploaded file and return (file_path, filename, file_size)."""
    ensure_directories()
    
    # Validate extension
    if not validate_file_extension(file.filename):
        raise ValueError(f"Invalid file type. Allowed: {', '.join(['.stl', '.step', '.stp'])}")
    
    # Sanitize filename
    original_filename = sanitize_filename(file.filename)
    ext = Path(original_filename).suffix.lower()
    
    # Create job directory
    job_dir = UPLOAD_DIR / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    filename = f"model{ext}"
    file_path = job_dir / filename
    
    file_size = 0
    async with aiofiles.open(file_path, 'wb') as f:
        while chunk := await file.read(8192):
            file_size += len(chunk)
            await f.write(chunk)
    
    # Validate file size
    if not validate_file_size(file_size):
        os.remove(file_path)
        raise ValueError(f"File size {file_size} exceeds maximum of 50MB")
    
    # Validate file integrity
    is_valid, error_msg = validate_file_integrity(str(file_path), ext)
    if not is_valid:
        os.remove(file_path)
        raise ValueError(error_msg or "File validation failed")
    
    return str(file_path), original_filename, file_size

def get_file_path(job_id: uuid.UUID, filename: str = "model.stl") -> Path:
    """Get file path for a job."""
    return UPLOAD_DIR / str(job_id) / filename

def get_gcode_path(job_id: uuid.UUID) -> Path:
    """Get G-code file path for a job."""
    ensure_directories()
    job_dir = GCODE_DIR / str(job_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    return job_dir / "output.gcode"

def file_exists(file_path: Path) -> bool:
    """Check if file exists."""
    return file_path.exists() and file_path.is_file()
