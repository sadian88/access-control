# Plan de Implementación — MVP Portería Virtual Interactiva V2

## Stack Tecnológico Propuesto

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend API | **FastAPI + Python 3.11** | Async nativo, WebSockets integrados, tipado con Pydantic |
| Face Recognition | **InsightFace `buffalo_l`** | Modelo preentrenado de alta precisión, embeddings 512d, sin licencia comercial restrictiva |
| ORM + Migraciones | **SQLAlchemy 2.0 (async) + Alembic** | Queries async, migrations versionadas |
| Base de Datos | **PostgreSQL (servidor propio) + pgvector** | Ya disponible; solo requiere habilitar la extensión pgvector y crear el schema |
| Frontend Admin | **React 18 + TypeScript + Tailwind CSS** | Componentes reactivos, estado simple con Zustand |
| Frontend Portería | **HTML/CSS/Vanilla JS** | Liviano, sin dependencias, corre en cualquier browser del dispositivo de portería |
| Contenedores | **Docker + Docker Compose** | Levanta backend y frontends; la DB es externa |
| Comunicación RT | **WebSockets nativos de FastAPI** | Sin infra extra (no Redis, no Kafka para el MVP) |
| Almacenamiento de imágenes | **Sistema de archivos local (volumen Docker)** | Suficiente para MVP; migrable a S3 después |

---

## Estructura de Carpetas Objetivo

```
edge_guard/
├── backend/
│   ├── app/
│   │   ├── api/          # Routers FastAPI
│   │   ├── core/         # Config, DB session, WebSocket manager
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── schemas/      # Pydantic schemas (request/response)
│   │   ├── services/     # Lógica de negocio (identify, visitors, events)
│   │   └── ml/           # InsightFace wrapper
│   ├── alembic/          # Migraciones de DB
│   ├── Dockerfile
│   └── requirements.txt
├── frontend-porteria/    # HTML/JS para pantalla de portería
├── frontend-admin/       # React app para dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/        # useWebSocket, useVisitors
│   │   └── pages/
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Fases de Implementación

---

### FASE 1 — Infraestructura Base
**Objetivo:** Stack corriendo con `docker compose up`. DB con esquema aplicado.

#### 1.1 Docker Compose
- ~~Servicio `db`~~: **la DB es externa** — solo se configura la conexión vía `.env`
- Servicio `backend`: FastAPI con hot-reload
- Servicio `frontend-admin`: Node para dev
- Volumen persistente para imágenes capturadas

> **Prerequisito antes de correr migraciones:** habilitar pgvector en tu servidor PostgreSQL ejecutando una sola vez:
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```

#### 1.2 Esquema de Base de Datos (Alembic)

**Tabla `people`**
```
id            UUID PK
full_name     TEXT
cedula        TEXT UNIQUE
email         TEXT
phone         TEXT
apartment     TEXT
embedding     vector(512)      -- pgvector
person_type   ENUM(resident, visitor)
state         ENUM(IN, OUT)    -- último estado conocido
last_entry_at TIMESTAMPTZ
created_at    TIMESTAMPTZ
```

**Tabla `events`** (log inmutable)
```
id            UUID PK
person_id     UUID FK → people.id  NULLABLE (desconocidos)
event_type    ENUM(entry, exit, unknown)
photo_path    TEXT
stay_duration INTERVAL           -- calculado al salir
timestamp     TIMESTAMPTZ
```

**Tabla `temp_unknowns`** (visitantes pendientes de registro)
```
id            UUID PK
photo_path    TEXT
embedding     vector(512)
created_at    TIMESTAMPTZ
expires_at    TIMESTAMPTZ        -- limpieza automática
```

#### 1.3 Índice pgvector
```sql
CREATE INDEX ON people USING hnsw (embedding vector_cosine_ops);
```

**Entregable:** `docker compose up` levanta backend (retorna `{"status": "ok"}`) y DB con migraciones aplicadas.

---

### FASE 2 — Motor Biométrico
**Objetivo:** Endpoint `/api/v1/identify` funcional que recibe un frame y devuelve match o unknown.

#### 2.1 Wrapper InsightFace (`backend/app/ml/face_engine.py`)
- Cargar modelo `buffalo_l` al iniciar la app (startup event)
- `detect_and_embed(image_bytes) → np.ndarray | None` — detecta rostro más prominente, retorna embedding 512d
- Si no hay rostro detectado → retorna `None` (caso "no hay nadie frente a cámara")

#### 2.2 Servicio de Identificación (`services/identify.py`)
```
1. Recibir frame Base64 → decodificar a bytes
2. detect_and_embed() → vector 512d
3. Consulta pgvector: SELECT ... ORDER BY embedding <=> $1 LIMIT 1
4. Si distancia < umbral (ej. 0.4): → Persona encontrada
5. Si distancia ≥ umbral: → Desconocido
```

#### 2.3 Endpoint `POST /api/v1/identify`
```json
// Request
{ "frame_b64": "...", "camera_id": "porteria_1" }

// Response - conocido
{ "status": "known", "message": "¡Bienvenido, Toño!", "person": {...} }

// Response - desconocido
{ "status": "unknown", "message": "Aguarde, contactando guardia...", "temp_id": "uuid" }

// Response - sin rostro
{ "status": "no_face", "message": "" }
```

**Entregable:** Test con imagen → retorna match correcto o unknown. Medir latencia (objetivo < 500ms).

---

### FASE 3 — Máquina de Estados y Eventos
**Objetivo:** La lógica IN/OUT funciona correctamente y genera logs inmutables.

#### 3.1 Servicio de Estado (`services/state_machine.py`)

**Flujo al identificar persona conocida:**
```
estado actual == OUT → 
    UPDATE people SET state=IN, last_entry_at=now()
    INSERT events (entry, person_id, photo_path)
    return "¡Bienvenido, {nombre}!"

estado actual == IN →
    duration = now() - last_entry_at
    UPDATE people SET state=OUT
    INSERT events (exit, person_id, duration, photo_path)
    return "¡Hasta luego, {nombre}! Estuviste {duration}"
```

**Flujo desconocido:**
```
INSERT temp_unknowns (photo_path, embedding)
INSERT events (unknown, person_id=NULL, photo_path)
return temp_id
```

#### 3.2 Formato de duración
- Función utilitaria: `format_duration(interval) → "2h 15m"` / `"45m"` / `"3h"`

**Entregable:** Llamadas consecutivas a `/identify` con la misma persona producen entrada → salida → entrada con duraciones correctas.

---

### FASE 4 — Frontend Portería (HTML/JS)
**Objetivo:** Pantalla funcional en el dispositivo de portería capturando y enviando frames.

#### 4.1 Captura de Cámara
- `navigator.mediaDevices.getUserMedia({ video: true })` → stream al `<video>`
- Captura silenciosa cada **N segundos** (configurable, ej. cada 1.5s) con `<canvas>`
- Solo enviar al backend si se detecta movimiento suficiente (comparación de frames opcionalmente)

#### 4.2 UI de Mensajes
- Pantalla en negro por defecto con logo del conjunto
- Al recibir respuesta del backend → mostrar mensaje centrado con animación
- Colores: Verde (`known`/entrada), Gris azulado (salida), Amarillo (unknown/aguarde)
- Timeout: mensaje visible 5 segundos, luego vuelve a modo espera

#### 4.3 Comunicación
- Polling al endpoint `/api/v1/identify` (no WebSocket en este lado; más simple y robusto)
- Backoff si el backend no responde (no saturar con requests)

**Entregable:** Abrir `index.html` en browser → pedir permiso de cámara → mostrar mensajes según respuesta del backend.

---

### FASE 5 — WebSockets y Notificaciones en Tiempo Real
**Objetivo:** El admin dashboard recibe push instantáneo de cada evento.

#### 5.1 WebSocket Manager (`core/ws_manager.py`)
```python
class ConnectionManager:
    active_connections: list[WebSocket]
    
    async def broadcast(self, message: dict): ...
```

#### 5.2 Endpoint WebSocket
```
GET /ws/admin
```
- El dashboard admin se conecta a este endpoint al cargar
- Reconexión automática en el cliente con backoff exponencial

#### 5.3 Eventos WebSocket (JSON)

```json
// Llegada conocida
{ "type": "entry", "person": { "name": "Toño", "apartment": "401" }, "timestamp": "..." }

// Salida conocida  
{ "type": "exit", "person": { "name": "Toño" }, "duration": "2h 15m", "timestamp": "..." }

// Desconocido
{ "type": "unknown", "temp_id": "uuid", "photo_url": "/media/temp/uuid.jpg", "timestamp": "..." }
```

#### 5.4 Integración con servicio de identificación
- Al finalizar `identify`, el servicio llama `await ws_manager.broadcast(event)` antes de retornar respuesta a portería.

**Entregable:** Abrir dos ventanas de browser. Una simula portería (envía frame), la otra tiene WS conectado → recibe push en < 100ms.

---

### FASE 6 — Dashboard Administrativo (React)
**Objetivo:** Panel completo con notificaciones, formulario de visitas y lista de presentes.

#### 6.1 Página Principal — Ocupantes Actuales
- `GET /api/v1/people?state=IN` → tabla con foto, nombre, apto, hora de entrada
- Se actualiza vía WebSocket al recibir eventos `entry` / `exit`

#### 6.2 Panel de Notificaciones (sidebar/toast)
- Cola de notificaciones en tiempo real
- Verde: entrada | Gris: salida | Rojo/Naranja: desconocido con foto
- Al clickear notificación de desconocido → abre modal con formulario

#### 6.3 Formulario de Nueva Visita (Modal)
```
Foto capturada [preview]
Cédula *
Nombre Completo *
Email
Teléfono
Apartamento destino *
[ Registrar e Ingresar ]
```

**Endpoint:** `POST /api/v1/visitors`
```json
{
  "temp_id": "uuid",
  "cedula": "123456",
  "full_name": "Juan Pérez",
  "email": "juan@mail.com",
  "phone": "3001234567",
  "apartment": "502"
}
```
- Backend: toma embedding de `temp_unknowns`, crea registro en `people`, estado=IN, dispara WebSocket de entrada.

#### 6.4 Historial de Eventos
- `GET /api/v1/events?limit=50&offset=0` → tabla paginada
- Filtros: fecha, tipo (entry/exit/unknown), nombre

#### 6.5 Gestión de Residentes
- `GET/POST/PATCH /api/v1/people` — CRUD básico
- Alta de residente con foto para enrollment inicial (sube foto → extrae embedding → guarda perfil)

**Entregable:** Dashboard completo funcionando end-to-end con backend real.

---

### FASE 7 — Hardening y Ajuste
**Objetivo:** Sistema listo para uso real en portería.

#### 7.1 Calibración del umbral de similitud
- Probar con múltiples personas: ajustar umbral (0.35–0.45) para balance precisión/recall
- Documentar umbral elegido

#### 7.2 Manejo de edge cases
- Doble detección rápida de la misma persona (debounce: ignorar si ya se procesó en últimos 10s)
- Limpieza automática de `temp_unknowns` expirados (cron job o background task FastAPI)
- Timeout de WebSocket con reconexión automática en frontend

#### 7.3 Variables de entorno (`.env`)
```
POSTGRES_URL=postgresql+asyncpg://user:password@tu-servidor:5432/edge_guard
SIMILARITY_THRESHOLD=0.40
FRAME_CAPTURE_INTERVAL_MS=1500
DEBOUNCE_SECONDS=10
INSIGHTFACE_MODEL=buffalo_l
MEDIA_PATH=/app/media
```

#### 7.4 Script de enrollment inicial
- CLI o endpoint protegido para cargar residentes existentes con foto
- `python enroll.py --name "Toño" --cedula "123" --photo foto.jpg`

**Entregable:** Sistema deployable con `docker compose up --build` en el servidor del conjunto.

---

## Orden de Ejecución Recomendado

```
Fase 1 (2-3h)  → Fase 2 (3-4h)  → Fase 3 (2h)
→ Fase 4 (2-3h) → Fase 5 (1-2h) → Fase 6 (4-6h) → Fase 7 (2h)
```

Cada fase produce un entregable funcional y testeable de forma independiente. Se puede usar el sistema de forma parcial desde la Fase 4 en adelante.

---

## Dependencias Python Clave

```
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pgvector
insightface
onnxruntime        # runtime para insightface
opencv-python-headless
numpy
pillow
python-multipart
python-dotenv
pydantic-settings
```
