FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    wget \
    curl \
    libstdc++6 \
    libgomp1 \
    fuse \
    cmake \
    build-essential \
    git \
    libgl1 \
    libglib2.0-0 \
    libglu1-mesa \
    libxrender1 \
    libxext6 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

# Install CuraEngine via apt
RUN apt-get update && apt-get install -y cura-engine && rm -rf /var/lib/apt/lists/*


# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload and gcode directories
RUN mkdir -p /app/uploads /app/gcode

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
