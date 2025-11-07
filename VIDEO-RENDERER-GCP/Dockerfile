# Dockerfile - REQUIRED for your Manim service
FROM python:3.11-slim

# Install system dependencies required for Manim
RUN apt-get update && apt-get install -y \
    # FFmpeg for video processing
    ffmpeg \
    # SoX for audio processing (required by manim-voiceover)
       texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-recommended \
    dvipng \
    cm-super \
    sox \
    libsox-fmt-all \
    # Cairo and Pango for text rendering  
    libcairo2-dev \
    libpango1.0-dev \
    pkg-config \
    # Python development headers
    python3-dev \
    # Build tools
    build-essential \
    gcc \
    g++ \
    # Utilities
    curl \
    wget \
    git \
    # Clean up to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy requirements.txt first (for layer caching)
COPY requirements.txt .

# Install Python dependencies (cached layer)
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY main.py .
COPY services/ ./services/

# Copy Firebase service account key
COPY service-key-account.json .


# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "main.py"]