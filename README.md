# 3D Printing Cost Estimation Platform

A production-ready web application for Five Fingers Innovative Solutions that automates 3D printing cost estimation with CuraEngine integration.

## Features

- **File Upload & Validation**: STL/STEP file upload with integrity checks
- **3D Model Visualization**: Cura-like interface with Three.js
- **Cura Slicing Integration**: Full parameter control and G-code generation
- **G-code Preview**: Layer-by-layer visualization with animation
- **Cost Calculation**: Comprehensive cost estimation with overhead factors
- **Admin Panel**: Material management, configuration, and failure logs
- **Email Notifications**: Mailtrap integration for job updates
- **User Authentication**: Simple username/password authentication

## Tech Stack

### Backend
- Python 3.11+ with FastAPI
- PostgreSQL 15+ with SQLAlchemy ORM
- Ultimaker CuraEngine 5.0+ (Docker containerized)
- Mailtrap API for email notifications

### Frontend
- React 18+ with TypeScript
- Three.js r150+ for 3D visualization
- Material-UI 5+ for UI components
- Vite 4+ for build tooling

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd final_c
```

2. Create environment file:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Mailtrap credentials
```

3. Start all services:
```bash
docker-compose up -d
```

4. Initialize database:
```bash
# Apply migrations
docker exec backend alembic upgrade head

# Seed initial data
docker exec backend python -m app.seed_data

# Create admin user
docker exec backend python -m app.create_admin
```

5. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Default Credentials

- Admin username: `admin`
- Admin password: `admin123` (change after first login)

## Project Structure

```
3d-printing-platform/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── cura-engine/      # CuraEngine Docker setup
└── docker-compose.yml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get session token

### File Management
- `POST /api/upload` - Upload STL/STEP file
- `GET /api/job/{job_id}` - Get job details

### Slicing
- `POST /api/slice/{job_id}` - Slice model with parameters
- `GET /api/files/{job_id}/model.stl` - Download model file
- `GET /api/files/{job_id}/output.gcode` - Download G-code

### Cost Estimation
- `POST /api/estimate/{job_id}` - Calculate cost estimate

### Admin
- `GET /api/admin/materials` - List materials
- `POST /api/admin/materials` - Create material
- `PUT /api/admin/materials/{id}` - Update material
- `DELETE /api/admin/materials/{id}` - Delete material
- `GET /api/admin/config` - Get configuration
- `PUT /api/admin/config` - Update configuration
- `GET /api/admin/logs` - Get failure logs

## Testing

Run backend tests:
```bash
docker exec backend pytest
```

Run frontend tests:
```bash
docker exec frontend npm test
```

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment

1. Update environment variables in `docker-compose.yml`
2. Use production database credentials
3. Configure Mailtrap API keys
4. Build and deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## License

Proprietary - Five Fingers Innovative Solutions
