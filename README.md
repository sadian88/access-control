# Edge Guard Project

MVP de control de acceso con reconocimiento facial en tiempo real.

## Arquitectura

- `backend/`: API FastAPI + SQLAlchemy async + PostgreSQL/pgvector
- `frontend-admin/`: Dashboard React + TypeScript (Vite)
- `frontend-porteria/`: Interfaz de portería (HTML/JS)

## Requisitos

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ con extensión `vector` (pgvector)

## Configuración inicial

1. En la raíz del proyecto, crear `.env` a partir de `.env.example`:

```bash
copy .env.example .env
```

2. Ajustar valores de `.env` (mínimo `POSTGRES_URL`) con tus credenciales reales.

Ejemplo:

```env
POSTGRES_URL=postgresql+asyncpg://usuario:password@localhost:5432/edge_guard
SIMILARITY_THRESHOLD=0.40
DEBOUNCE_SECONDS=10
MEDIA_PATH=/app/media
```

Si ejecutas el backend fuera de Docker en Windows, conviene usar una ruta local para medios, por ejemplo:

```env
MEDIA_PATH=backend/media
```

## Base de datos

Crear la base de datos y habilitar pgvector:

```sql
CREATE DATABASE edge_guard;
\c edge_guard
CREATE EXTENSION IF NOT EXISTS vector;
```

Aplicar migraciones:

```bash
cd backend
alembic upgrade head
```

## Ejecutar Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Healthcheck:

- `http://localhost:8000/health`

Docs OpenAPI:

- `http://localhost:8000/docs`

## Ejecutar Frontend Admin (React)

```bash
cd frontend-admin
npm install
npm run dev
```

Disponible en:

- `http://localhost:5173`

Notas:

- Ya incluye proxy Vite para `'/api'`, `'/ws'` y `'/media'` hacia `http://localhost:8000`.

## Ejecutar Frontend Portería

Servir `frontend-porteria/` con cualquier servidor estático:

```bash
cd frontend-porteria
npx serve .
```

Por defecto usa:

- API: `http://localhost:8000`
- WebSocket: `ws://localhost:8000/api/v1/ws/admin`

## Levantar solo Backend con Docker Compose

En la raíz:

```bash
docker compose up --build
```

Esto levanta el backend en `http://localhost:8000` y monta volumen persistente para `media`.

## Flujo recomendado de desarrollo (local)

1. Iniciar PostgreSQL + pgvector.
2. Configurar `.env`.
3. Ejecutar migraciones (`alembic upgrade head`).
4. Levantar backend (`:8000`).
5. Levantar admin (`:5173`).
6. Levantar portería (servidor estático).

## Endpoints principales

- `POST /api/v1/identify`
- `POST /api/v1/visitors`
- `GET /api/v1/people?state=IN`
- `GET /api/v1/events?limit=50`
- `WS /api/v1/ws/admin`

## Solución de problemas rápida

- Error de conexión a BD: revisar `POSTGRES_URL` y que PostgreSQL esté activo.
- Error `type "vector" does not exist`: falta `CREATE EXTENSION vector`.
- Frontend sin datos: verificar que backend esté en `http://localhost:8000`.
- Cámara bloqueada en portería: permitir permisos del navegador.
