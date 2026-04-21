# 3D Printing Cost Estimation Platform - R2 (Final Release)

A production-ready web application for Five Fingers Innovative Solutions that automates 3D printing cost estimation with CuraEngine integration.

## Release Information

**Version**: R2 (Final Release)  
**Status**: Production Ready  
**Test Coverage**: 30 test cases covering all use cases  
**Last Updated**: April 2026

## Features

### Core Functionality
- **File Upload & Validation**: STL/STEP file upload with integrity checks, file size validation (max 50MB)
- **3D Model Visualization**: Cura-like interface with Three.js for STL rendering
- **Cura Slicing Integration**: Full parameter control and G-code generation using CuraEngine
- **G-code Preview**: Layer-by-layer visualization with animation
- **Cost Calculation**: Comprehensive cost estimation with overhead factors (waste and failure multipliers)
- **Job History**: Track all uploaded jobs with status, cost estimates, and G-code download links

### User Management
- **User Authentication**: Secure username/password authentication with JWT tokens
- **Email Verification**: Mailtrap integration for user verification
- **Role-Based Access**: Customer and Admin roles with appropriate permissions
- **Profile Management**: View and update user profile information

### Admin Panel
- **Material Management**: Add, edit, and delete printing materials (PLA, ABS, PETG, etc.)
- **Configuration Management**: Update machine time rates, waste factors, failure factors
- **Failure Logs Dashboard**: View and filter slicing failures with detailed error messages
- **Audit Trail**: Track all configuration changes

### Advanced Features
- **Model Validation**: Check if models exceed printer volume (200×200×200mm)
- **Slicing Parameters**: Configure layer height, infill, supports, and other slicing options
- **Error Handling**: Clear error messages with actionable suggestions for failed operations
- **Performance Monitoring**: API response time tracking and upload speed monitoring

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
cd src
```

2. Create environment file:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your Mailtrap credentials
```

3. Start all services:
```bash
docker compose up -d
```

4. Initialize database:
```bash
# Create tables
docker exec backend python -m app.create_tables

# Seed initial data
docker exec backend python -m app.seed_data

# Create admin user
docker exec backend python -m app.create_admin
```

5. Access the application:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- PostgreSQL: localhost:5433

## Shutting Down

To stop the services while keeping the data:
```bash
docker compose stop
```

To stop and remove containers (data in volumes persists):
```bash
docker compose down
```

## Default Credentials

- Admin username: `admin`
- Admin password: `admin123` (change after first login)

## Cost Calculation Formula

The platform uses the following formula to calculate printing costs:

```
Total Cost = (Material Cost × Waste Factor × Failure Factor) + Machine Time Cost

Where:
- Material Cost = material_volume_mm³ × density_g/cm³ × cost_per_gram
- Waste Factor = 1.25 (default, configurable by admin)
- Failure Factor = 1.25 (default, configurable by admin)
- Machine Time Cost = print_time_seconds × (machine_hourly_rate / 3600)
```

**Example Calculation** (for 50g material, 2 hours print time, PLA at ₹0.03/g, machine rate ₹500/hour):
- Material Cost = 50 × 0.03 = ₹1.50
- Material with Overheads = 1.50 × 1.25 × 1.25 = ₹2.34
- Machine Time Cost = 2 × 500 = ₹1000
- **Total Cost = ₹2.34 + ₹1000 = ₹1002.34**

## Project Structure

```
src/
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth.py         # Authentication
│   │   │   ├── upload.py       # File upload
│   │   │   ├── slicing.py      # Slicing operations
│   │   │   ├── admin.py        # Admin endpoints
│   │   │   └── ...
│   │   ├── models/             # SQLAlchemy models
│   │   ├── database/           # Database configuration
│   │   └── main.py            # FastAPI app entry point
│   ├── tests/                  # Test suite
│   │   ├── conftest.py        # Pytest fixtures
│   │   ├── test_uc01_authentication.py
│   │   ├── test_uc02_upload.py
│   │   ├── test_uc03_04_05_slicing.py
│   │   ├── test_uc06_07_cost_estimation.py
│   │   ├── test_uc08_error_handling.py
│   │   ├── test_uc09_admin_logs.py
│   │   ├── test_uc11_material_config.py
│   │   ├── test_uc12_13_admin_config.py
│   │   ├── test_uc14_validation.py
│   │   ├── test_uc15_job_history.py
│   │   ├── test_integration.py
│   │   ├── test_performance.py
│   │   └── test_security.py
│   ├── run_all_tests.sh        # Test runner script
│   ├── run_all_tests.py        # Test runner (Python)
│   └── TEST_RUNNER_README.md   # Test runner documentation
├── frontend/                    # React frontend
├── docs/                       # Documentation
│   ├── TestPlan.xls           # Test plan document
│   └── TestPlan.csv           # Test plan CSV
└── docker-compose.yml          # Docker services configuration
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

### Test Suite Overview

The project includes a comprehensive test suite with **30 test cases** covering all use cases from UC-01 through UC-15, plus integration, performance, and security tests.

### Test Coverage

- **UC-01 (Authentication)**: 3 tests - Login validation, unauthorized access, user profile
- **UC-02 (Upload)**: 3 tests - Valid STL upload, invalid file type, oversized file
- **UC-03 (3D Viewer)**: 2 tests - Model rendering, large file performance
- **UC-04 (Slicing Parameters)**: 2 tests - Valid parameters, missing material
- **UC-05 (Slicing Process)**: 3 tests - Success, invalid geometry, service unavailable
- **UC-06 (Cost Formula)**: 2 tests - Formula verification, known values calculation
- **UC-07 (Cost Display)**: 1 test - Cost estimate breakdown
- **UC-08 (Error Handling)**: 1 test - Slicing error display
- **UC-09 (Admin Logs)**: 1 test - Failure logs dashboard
- **UC-11 (Material Config)**: 3 tests - Edit material, add material, invalid cost
- **UC-12 (Machine Rate)**: 1 test - Update machine time rate
- **UC-13 (Overhead Factors)**: 1 test - Update waste and failure factors
- **UC-14 (Validation)**: 1 test - Oversized model validation
- **UC-15 (Job History)**: 1 test - Job history display
- **Integration**: 1 test - Auth workflow
- **Performance**: 3 tests - Upload speed, slicing speed, API response time
- **Security**: 1 test - Unauthorized access

### Running Tests

**Run all tests with the test runner script:**
```bash
cd backend
./run_all_tests.sh
```

**Or run with Python:**
```bash
cd backend
python run_all_tests.py
```

**Run specific test files:**
```bash
cd backend
python -m pytest tests/test_uc01_authentication.py -v
python -m pytest tests/test_uc02_upload.py -v
python -m pytest tests/test_uc03_04_05_slicing.py -v
# ... etc
```

**Run specific test cases:**
```bash
cd backend
python -m pytest tests/test_uc01_authentication.py::test_uc01_tc01_login_valid_credentials -v
```

**Run with detailed output:**
```bash
cd backend
python -m pytest tests/ -v --tb=long
```

### Test Environment

Tests use an in-memory SQLite database for isolation and mock external services (file system, email, Cura slicing service) to ensure reliable, fast test execution.

### Test Results

All 30 test cases pass with 0 failures:
- 35 total tests (30 test plan + 5 existing tests)
- 0 skipped
- 0 failed

### Test Plan Documentation

The test suite is based on the comprehensive test plan documented in:
- `docs/TestPlan.xls` - Excel format with detailed test cases
- `docs/TestPlan.csv` - CSV format for easy reference

The test plan includes:
- Pre-conditions for each test
- Step-by-step test procedures
- Expected outcomes
- R1/R2 implementation status tracking

## Release Notes (R2)

### New Features in R2
- Comprehensive test suite with 30 test cases covering all use cases
- Enhanced error handling with specific error messages
- Improved admin failure logs dashboard with working filters
- Model validation for printer volume constraints
- Job history with detailed information display
- Performance monitoring and optimization

### Improvements from R1
- Fixed admin failure log filtering functionality
- Enhanced slicing error messages with specific problem identification
- Added material cost validation (positive numbers only)
- Improved API response times with DB pooling and caching
- Better test isolation using in-memory SQLite database

### Known Limitations
- STEP file support is planned but not yet implemented (STL only)
- Account lockout after failed login attempts is not implemented
- G-code preview animation is basic (layer-by-layer only)
- 3D viewer supports STL files only (STEP files require conversion)

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

## Environment Variables

The following environment variables are configured in `backend/.env`:

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# JWT Secret
SECRET_KEY=your-secret-key-here

# Email (Mailtrap)
MAILTRAP_API_KEY=your-mailtrap-api-key
MAILTRAP_FROM_EMAIL=noreply@example.com

# File Storage
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=52428800  # 50MB in bytes

# Testing
TESTING=false
LOG_DIR=./logs
```

## Troubleshooting

### Tests Fail with Database Connection Error
- Ensure PostgreSQL is running: `docker compose ps`
- Check database credentials in `.env` file
- For tests, ensure `TESTING=true` is set to use in-memory SQLite

### File Upload Fails
- Check `UPLOAD_DIR` exists and has write permissions
- Verify file size is under 50MB limit
- Check file type is `.stl` or `.step`

### Slicing Service Unavailable
- Ensure CuraEngine container is running: `docker compose ps`
- Check CuraEngine logs: `docker compose logs cura-engine`
- Verify network connectivity between backend and CuraEngine

### Email Notifications Not Working
- Verify Mailtrap API key is correct
- Check Mailtrap service status
- Review backend logs for email errors

### Admin Panel Shows No Data
- Ensure database is seeded: `docker exec backend python -m app.seed_data`
- Check admin user exists: `docker exec backend python -m app.create_admin`
- Verify admin credentials are correct

## Support and Documentation

- **Test Plan**: See `docs/TestPlan.xls` or `docs/TestPlan.csv` for detailed test cases
- **API Documentation**: Access at http://localhost:8000/docs when backend is running
- **Test Runner Documentation**: See `backend/TEST_RUNNER_README.md`
