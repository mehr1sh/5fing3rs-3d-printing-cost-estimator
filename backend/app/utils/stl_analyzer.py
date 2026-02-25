import trimesh
import numpy as np
from typing import Dict, List, Tuple, Optional
from pathlib import Path

def analyze_stl(file_path: str) -> Dict:
    """Analyze STL file and return model properties."""
    try:
        mesh = trimesh.load(file_path)
        
        # Basic properties
        volume_mm3 = float(mesh.volume * 1000)  # Convert cm³ to mm³
        surface_area_mm2 = float(mesh.area * 100)  # Convert cm² to mm²
        
        # Bounding box
        bounds = mesh.bounds
        dimensions = {
            "x": float(bounds[1][0] - bounds[0][0]),
            "y": float(bounds[1][1] - bounds[0][1]),
            "z": float(bounds[1][2] - bounds[0][2])
        }
        
        # Center point
        center = mesh.centroid
        
        # Triangle count
        triangle_count = len(mesh.faces)
        
        # Check for issues
        issues = []
        
        # Check for thin walls (simplified - check for very small dimensions)
        min_dimension = min(dimensions.values())
        if min_dimension < 0.8:
            issues.append({
                "type": "thin_wall",
                "severity": "warning",
                "message": f"Model has dimension smaller than 0.8mm: {min_dimension:.2f}mm"
            })
        
        # Check for non-manifold edges
        if not mesh.is_watertight:
            issues.append({
                "type": "non_watertight",
                "severity": "warning",
                "message": "Model is not watertight (may have holes or non-manifold edges)"
            })
        
        # Check for overhangs (simplified - check angle of faces)
        face_normals = mesh.face_normals
        z_normals = face_normals[:, 2]
        overhang_angle = np.arccos(np.clip(z_normals, -1, 1)) * 180 / np.pi
        overhangs = np.sum(overhang_angle > 45)
        if overhangs > 0:
            issues.append({
                "type": "overhang",
                "severity": "info",
                "message": f"Model has {overhangs} faces with overhang angle > 45° (may need supports)"
            })
        
        return {
            "volume_mm3": volume_mm3,
            "volume_cm3": volume_mm3 / 1000,
            "surface_area_mm2": surface_area_mm2,
            "dimensions": dimensions,
            "center": {
                "x": float(center[0]),
                "y": float(center[1]),
                "z": float(center[2])
            },
            "triangle_count": triangle_count,
            "is_watertight": bool(mesh.is_watertight),
            "issues": issues
        }
    except Exception as e:
        raise ValueError(f"Error analyzing STL file: {str(e)}")

def detect_thin_walls(mesh: trimesh.Trimesh, threshold: float = 0.8) -> List[Dict]:
    """Detect thin walls in the mesh."""
    issues = []
    bounds = mesh.bounds
    dimensions = bounds[1] - bounds[0]
    
    for i, dim in enumerate(['x', 'y', 'z']):
        if dimensions[i] < threshold:
            issues.append({
                "dimension": dim,
                "thickness": float(dimensions[i]),
                "location": "entire_model"
            })
    
    return issues

def detect_overhangs(mesh: trimesh.Trimesh, angle_threshold: float = 45.0) -> List[Dict]:
    """Detect overhanging faces that may need support."""
    face_normals = mesh.face_normals
    z_normals = face_normals[:, 2]
    angles = np.arccos(np.clip(z_normals, -1, 1)) * 180 / np.pi
    
    overhang_faces = np.where(angles > angle_threshold)[0]
    
    issues = []
    if len(overhang_faces) > 0:
        # Get face centers
        face_centers = mesh.triangles_center[overhang_faces]
        issues.append({
            "face_count": len(overhang_faces),
            "max_angle": float(np.max(angles[overhang_faces])),
            "locations": face_centers.tolist()[:10]  # Limit to first 10 for response size
        })
    
    return issues
