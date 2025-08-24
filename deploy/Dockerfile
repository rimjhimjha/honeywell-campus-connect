# SafeZoneAI Docker Image
# Multi-stage build for optimized production deployment

# Stage 1: Base Python environment
FROM python:3.9-slim-buster as base

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgthread-2.0-0 \
    libgtk-3-0 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    gfortran \
    openexr \
    libatlas-base-dev \
    python3-dev \
    libtbb2 \
    libtbb-dev \
    libdc1394-22-dev \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies
FROM base as dependencies

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 3: Application
FROM dependencies as application

# Copy application code
COPY . .

# Create directories for models and data
RUN mkdir -p /app/models /app/data /app/logs

# Download YOLOv8 model
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Create non-root user for security
RUN groupadd -r safezone && useradd -r -g safezone safezone
RUN chown -R safezone:safezone /app
USER safezone

# Expose ports
EXPOSE 8000 8501

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command (can be overridden)
CMD ["python", "-m", "backend.app"]

# Stage 4: Production optimized
FROM application as production

# Additional optimizations for production
ENV PYTHONOPTIMIZE=1

# Remove development packages
RUN pip uninstall -y pytest pytest-asyncio

# Final stage for Raspberry Pi
FROM python:3.9-slim-buster as raspberry-pi

# Install only essential system packages for Pi
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libjpeg-dev \
    libpng-dev \
    libatlas-base-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only essential files
COPY requirements.txt .
COPY . .

# Install lightweight dependencies for Pi
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Create non-root user
RUN groupadd -r safezone && useradd -r -g safezone safezone
RUN chown -R safezone:safezone /app
USER safezone

EXPOSE 8000 8501

CMD ["python", "-m", "backend.app"]