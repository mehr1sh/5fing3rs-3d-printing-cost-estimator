# 3D Printing Platform - Local Setup Guide

A cloud-based 3D printing slicing platform built with FastAPI, React, and a custom Python/Trimesh slicer.

## Prerequisites

1. **Docker & Docker Compose** must be installed on your machine.
    - [Get Docker](https://docs.docker.com/get-docker/)
2. **Git** to clone the repository.

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
Clone this repository to your local machine and enter the directory:
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd final_c
```

### 2. Configure Environment Variables
Copy the template environment file to create your actual `.env` file:
```bash
cp .env.example .env
```
*(If `.env.example` doesn't exist, just create a `.env` file containing `JWT_SECRET_KEY=supersecretkey123`)*

### 3. Build and Start the Application
Use Docker Compose to build and run the backend, frontend, and database containers:
```bash
# If using older docker-compose:
docker-compose up --build -d

# If using modern docker compose:
docker compose up --build -d
```
*Note: The first build will take a few minutes as it downloads the Python images and installs dependencies (like `trimesh` and `numpy`).*

### 4. Access the Application
Once the containers are running:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Stopping the Application
To stop the services without deleting your database/data:
```bash
docker compose stop
```

To stop **and remove** the containers (your database volumes will persist):
```bash
docker compose down
```

---

## 🛠️ Development & Troubleshooting

- **Logs:** If something isn't working, check the backend logs:
  ```bash
  docker compose logs -f backend
  ```
- **Hot-reloading:** Both the React frontend and FastAPI backend are configured for hot-reloading. Changes you make to the source code on your host machine will immediately reflect in the running containers.
- **Slicing Engine:** The application uses a custom slicing engine written in Python (`trimesh.intersections.mesh_plane`) to generate G-code directly, bypassing heavy C++ CuraEngine binaries. This ensures maximum compatibility across different OS platforms when running in Docker.
