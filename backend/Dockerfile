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
    && rm -rf /var/lib/apt/lists/*

# Install CuraEngine - try multiple sources
WORKDIR /tmp
RUN (wget -q https://github.com/Ultimaker/CuraEngine/releases/download/5.7.2/CuraEngine-5.7.2-linux.AppImage -O /tmp/CuraEngine.AppImage && \
     chmod +x /tmp/CuraEngine.AppImage && \
     /tmp/CuraEngine.AppImage --appimage-extract 2>/dev/null && \
     mv squashfs-root/usr/bin/CuraEngine /usr/bin/CuraEngine 2>/dev/null && \
     rm -rf /tmp/CuraEngine.AppImage /tmp/squashfs-root) || \
    (wget -q https://github.com/Ultimaker/CuraEngine/archive/refs/tags/5.7.2.tar.gz -O /tmp/cura.tar.gz && \
     tar -xzf /tmp/cura.tar.gz && \
     cd CuraEngine-5.7.2 && \
     mkdir build && cd build && \
     cmake .. && make -j$(nproc) && \
     cp CuraEngine /usr/bin/CuraEngine && \
     cd / && rm -rf /tmp/cura.tar.gz /tmp/CuraEngine-5.7.2) || \
    (echo "#!/bin/bash" > /usr/bin/CuraEngine && \
     echo 'echo "Error: CuraEngine not installed. Slicing will fail."' >> /usr/bin/CuraEngine && \
     echo 'echo "Please install CuraEngine manually or use a different slicing method."' >> /usr/bin/CuraEngine && \
     echo 'exit 1' >> /usr/bin/CuraEngine && \
     chmod +x /usr/bin/CuraEngine && \
     echo "CuraEngine installation failed - using fallback script")

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
