#!/bin/sh
set -e

echo "Esperando a que PostgreSQL esté listo..."
# El contenedor ya depende de db (condition: healthy), pero dejamos una pequeña pausa de seguridad
sleep 2

echo "Ejecutando migraciones con Alembic..."
alembic upgrade head

echo "Iniciando servidor Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
