# Setup Instructions

## Prerequisites
- Docker and Docker Compose installed
- Git

## Initial Setup

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Wait for services to be healthy** (check with `docker-compose ps`)

3. **Create database tables:**
```bash
docker exec backend python -m app.create_tables
```

4. **Seed initial data:**
```bash
docker exec backend python -m app.seed_data
```

5. **Create admin user:**
```bash
docker exec backend python -m app.create_admin admin admin123 admin@fivefingers.com
```

## Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432

## Default Credentials

- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the admin password after first login!

## Testing

Run backend tests:
```bash
docker exec backend pytest
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

### Backend Issues
```bash
# View backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Frontend Issues
```bash
# View frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

### CuraEngine Issues
Note: The CuraEngine container uses a placeholder script. In production, you need to:
1. Download the actual CuraEngine binary from Ultimaker
2. Replace the placeholder in `cura-engine/Dockerfile`
3. Rebuild the container

## Stopping Services

```bash
docker-compose down
```

To remove volumes (⚠️ deletes all data):
```bash
docker-compose down -v
```
