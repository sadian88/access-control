# Edge Guard Project - Agent Guidelines

## Project Structure

- `backend/` - FastAPI Python application with PostgreSQL/pgvector
- `frontend-admin/` - React + TypeScript admin dashboard (port 5173)
- `frontend-porteria/` - Vanilla JS entrance kiosk interface

## Build & Run Commands

### Backend (Python/FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- Alembic migrations: `alembic upgrade head`
- Run single test: `pytest tests/test_file.py::test_name` (if tests exist)

### Frontend Admin (React)
```bash
cd frontend-admin
npm install
npm run dev
```
- Build: `npm run build`
- Type-check: `npx tsc --noEmit`

### Frontend Porteria
- Serve static files via any HTTP server (e.g. `npx serve .`)

## Code Style

### Python (Backend)
- Use `snake_case` for functions, variables, modules
- Use `PascalCase` for classes
- Type hints required: `def func(param: str) -> str:`
- Pydantic models in `app/schemas/`
- SQLAlchemy models in `app/models/`
- API endpoints in `app/api/v1/endpoints/`
- Services in `app/services/`
- Follow existing structure: import from `app.core`, `app.api`, etc.

### TypeScript/React (Frontend)
- Use `camelCase` for functions/variables, `PascalCase` for components
- Strict mode enabled (`strict: true` in tsconfig.json)
- Interfaces in `src/types.ts`
- Zustand state management in `src/store/`
- Custom hooks in `src/hooks/`
- API client in `src/api/client.ts`
- Components in `src/components/`

## Naming Conventions

- Models: `Person`, `Event`, `TempUnknown`
- Schemas: `PersonResponse`, `VisitorCreateRequest`
- Services: `identify_face`, `process_state`
- Components: `EventsTable`, `UnknownModal`, `OccupantsList`
- Store: `useStore` (Zustand)
- WebSocket events: `type: 'entry' | 'exit' | 'unknown'`

## Error Handling

- Backend: Return appropriate HTTP status codes, Pydantic validation errors
- Frontend: Try/catch around fetch calls with user-friendly messages
- Database errors: Use SQLAlchemy exceptions, rollback on failure

## Imports

- Python: Absolute imports from `app.` root
- TS/TSX: Relative imports (`../types`, `./store`)

## Formatting

- Python: 4-space indentation, black-compatible line length ~88 chars
- TypeScript: 2-space indentation, max 100 chars
- Use single quotes for strings

## Database

- PostgreSQL with pgvector extension for 512-dim embeddings
- SQLAlchemy ORM with async operations
- Alembic for migrations
- Database config via environment variables in `.env`

## Testing

- No test suite defined yet (MVP phase)
- Backend tests should use pytest
- Frontend tests should use Vitest/Vite + React Testing Library

## API Endpoints

- `POST /api/v1/identify` -面部识别入口 (Base64 frame →识别 response)
- `POST /api/v1/visitors` - Register unknown visitor
- `GET /api/v1/people?state=IN` - Get current occupants
- `GET /api/v1/events?limit=50` - Get event history
- `WS /api/v1/ws/admin` - Real-time WebSocket for admin dashboard

## Note

This is an MVP project. Follow existing patterns strictly. When in doubt, match the style of nearby files.
