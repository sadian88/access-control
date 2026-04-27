FROM python:3.11-slim

# Dependencias de sistema requeridas por opencv-python-headless, insightface, onnxruntime y psycopg/libpq
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    build-essential \
    cmake \
    libglib2.0-0 \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Crear usuario no-root para ejecutar la aplicación
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Instalar dependencias Python primero (aprovechar caché de capas)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Crear directorio de medios persistente y ajustar permisos
RUN mkdir -p /app/media && chown -R appuser:appgroup /app

# Copiar y habilitar script de entrada (migraciones + servidor)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

ENTRYPOINT ["/entrypoint.sh"]
