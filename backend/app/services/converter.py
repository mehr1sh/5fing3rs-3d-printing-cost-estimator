import logging
from pathlib import Path

logger = logging.getLogger(__name__)

FORMATS_NEEDING_CONVERSION = {".step", ".stp", ".obj", ".3mf", ".ply"}


def convert_step_to_stl(step_path: str, stl_path: str, deflection: float = 0.1) -> None:
    """Convert STEP/STP to binary STL using cadquery."""
    try:
        import cadquery as cq
    except ImportError:
        raise RuntimeError(
            "cadquery is required for STEP conversion. "
            "Install with: pip install cadquery"
        )
    
    try:
        # Import the STEP file
        model = cq.importers.importStep(step_path)
        # Export as STL
        cq.exporters.export(model, stl_path, exportType='STL', tolerance=deflection)
    except Exception as e:
        raise ValueError(f"Failed to convert STEP file: {e}")

    logger.info("Converted STEP → STL: %s → %s", step_path, stl_path)


def convert_mesh_to_stl(source_path: str, stl_path: str) -> None:
    """Convert OBJ, 3MF, or PLY to STL using trimesh."""
    import trimesh

    mesh = trimesh.load(source_path, force="mesh")
    if mesh is None or mesh.is_empty:
        raise ValueError(f"Loaded mesh is empty: {source_path}")

    mesh.export(stl_path)
    logger.info("Converted mesh → STL: %s → %s", source_path, stl_path)


def convert_to_stl(source_path: str, stl_path: str, extension: str) -> None:
    """Convert any supported 3D format to STL. No-op for .stl input."""
    ext = extension.lower()
    if ext == ".stl":
        return
    if ext in (".step", ".stp"):
        convert_step_to_stl(source_path, stl_path)
    elif ext in (".obj", ".3mf", ".ply"):
        convert_mesh_to_stl(source_path, stl_path)
    else:
        raise ValueError(f"No converter available for format: {ext}")
