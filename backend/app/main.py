from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, upload, slicing, estimation, admin
from app.database.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="3D Printing Cost Estimation Platform",
    description="API for 3D printing cost estimation with CuraEngine integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(slicing.router)
app.include_router(estimation.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "3D Printing Cost Estimation Platform API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
