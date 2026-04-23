# 5Fing3rs 3D Printing Cost Estimator

A cloud-based platform for 3D printing cost estimation with integrated slicing capabilities. Upload your STL files, configure slicing parameters, and get accurate cost estimates based on material usage, print time, and custom pricing models.

## Features

- **STL File Upload & Analysis**: Upload 3D models and analyze geometry, volume, and dimensions
- **Custom Slicing Engine**: Python-based slicing using Trimesh for cross-platform compatibility
- **Cost Estimation**: Calculate printing costs based on material, print time, and customizable pricing factors
- **3D Model Viewer**: Interactive Three.js-based 3D model preview in the browser
- **G-code Preview**: Visualize generated toolpaths before printing
- **Material Management**: Configure custom materials with density, cost per gram, and other properties
- **User Authentication**: Secure JWT-based authentication system
- **Admin Dashboard**: Manage users, materials, and view system logs
- **Job Tracking**: Track all slicing and estimation jobs with status updates
- **RESTful API**: Well-documented FastAPI backend with Swagger UI

## Tech Stack

### Backend
- **FastAPI**: Modern, fast web framework for building APIs
- **Python 3.11+**: Core backend language
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Production database
- **Trimesh**: 3D mesh processing and analysis
- **Pydantic**: Data validation using Python type annotations
- **JWT**: Secure authentication tokens

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **Material-UI**: React component library
- **Axios**: HTTP client for API requests
- **Zustand**: State management

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mehr1sh/5fing3rs-3d-printing-cost-estimator.git
cd 5fing3rs-3d-printing-cost-estimator
```

2. Configure environment variables:
```bash
cp src/backend/.env.example src/backend/.env
```
Edit `.env` and set your `JWT_SECRET_KEY`

3. Build and start with Docker Compose:
```bash
docker compose up -d --build
```

4. Initialize the database:
```bash
docker exec backend python -m app.create_tables
docker exec backend python -m app.seed_data
docker exec backend python -m app.create_admin
```

5. Access the application:
- **Frontend**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs

## Usage

1. **Sign Up / Login**: Create an account or log in with existing credentials
2. **Upload STL**: Drag and drop your 3D model file
3. **Configure Parameters**: Set layer height, infill density, and other slicing options
4. **Slice & Estimate**: Generate G-code and get cost breakdown
5. **View Results**: Examine 3D preview, G-code visualization, and cost details
6. **Track Jobs**: Monitor job status in the dashboard

## Project Structure

```
.
├── src/
│   ├── backend/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/      # API endpoints
│   │   │   ├── models/   # Database models
│   │   │   ├── schemas/  # Pydantic schemas
│   │   │   ├── services/ # Business logic
│   │   │   └── utils/    # Utilities
│   │   └── tests/        # Backend tests
│   └── frontend/         # React frontend
│       └── src/
│           ├── components/  # React components
│           ├── pages/       # Page components
│           └── context/     # React contexts
├── docker-compose.yml
└── README.md
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/upload` - Upload STL file
- `POST /api/slicing/slice` - Slice model and generate G-code
- `POST /api/estimation/calculate` - Calculate printing cost
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/{id}` - Get job details
- `GET /api/materials` - List available materials
- `POST /api/admin/materials` - Add material (admin only)

## Development

### Running Tests

Backend tests:
```bash
docker exec backend python -m pytest
```

### Viewing Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Stopping the Application

```bash
docker compose stop    # Stop containers
docker compose down   # Stop and remove containers
```

## License

This project is open source and available under the MIT License.
