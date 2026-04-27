import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, engine, get_db
from app.core.ws_manager import ws_manager
from app.models.models import Person, PersonType, StateType
from app.schemas.identify import IdentifyRequest, IdentifyResponse, ApprovalRequest
from app.services.identify import identify_face, handle_approval, complete_registration, cancel_pending, _save_photo

router = APIRouter()
_log = logging.getLogger(__name__)


def _is_transient_pg_error(exc: BaseException) -> bool:
    """Errores típicos cuando el remoto cierra el TCP (WinError 10054, RST, etc.)."""
    try:
        import asyncpg
    except ImportError:
        asyncpg = None  # type: ignore[assignment]

    cur: BaseException | None = exc
    seen: set[int] = set()
    while cur is not None and id(cur) not in seen:
        seen.add(id(cur))
        if isinstance(cur, (ConnectionResetError, BrokenPipeError, TimeoutError)):
            return True
        if asyncpg is not None and isinstance(
            cur,
            (
                asyncpg.exceptions.ConnectionDoesNotExistError,
                asyncpg.exceptions.InterfaceError,
            ),
        ):
            return True
        cur = cur.__cause__

    msg = str(exc).lower()
    return (
        "connection was closed" in msg
        or "connection is closed" in msg
        or "10054" in msg
        or "closed in the middle" in msg
    )


async def _identify_with_db_retries(frame_b64: str) -> IdentifyResponse:
    last: BaseException | None = None
    for attempt in range(3):
        try:
            async with AsyncSessionLocal() as db:
                return await identify_face(frame_b64, db)
        except Exception as e:
            last = e
            if attempt == 2 or not _is_transient_pg_error(e):
                raise
            _log.warning(
                "Fallo transitorio con PostgreSQL (intento %s/3), reintentando: %s",
                attempt + 1,
                e,
            )
            await engine.dispose()
            await asyncio.sleep(0.3 * (attempt + 1))
    assert last is not None
    raise last


@router.post("/identify", response_model=IdentifyResponse)
async def identify(payload: IdentifyRequest) -> IdentifyResponse:
    try:
        return await _identify_with_db_retries(payload.frame_b64)
    except Exception as e:
        if _is_transient_pg_error(e):
            raise HTTPException(
                status_code=503,
                detail="No se pudo conectar a la base de datos. Comprueba red, firewall y que PostgreSQL acepte conexiones desde este equipo.",
            ) from e
        raise


@router.post("/approve/{pending_id}")
async def approve(
    pending_id: str,
    action: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Approve or deny access for a pending person"""
    result = await handle_approval(
        pending_id,
        action.action,
        db,
        visitor_card_number=action.visitor_card_number,
        belongs_to=action.belongs_to,
    )
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Pending request not found")
    return result


@router.post("/complete-registration/{pending_id}")
async def complete_registration_endpoint(
    pending_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Complete registration for unknown person"""
    from app.ml.face_engine import face_engine
    import base64
    
    # Get the stored frame from pending registration
    pending_reg = None
    from app.services.identify import _pending_registrations
    if pending_id in _pending_registrations:
        pending_reg = _pending_registrations[pending_id]
    
    # Extract embedding from stored frame and save photo
    embedding = None
    photo_path = None
    if pending_reg and pending_reg.get("frame_b64"):
        frame_b64 = pending_reg["frame_b64"]
        if "," in frame_b64:
            frame_b64 = frame_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(frame_b64)
        embedding = await face_engine.detect_and_embed_async(image_bytes)
        photo_path = _save_photo(image_bytes, "people")
    
    # Fallback to random if no embedding found
    import numpy as np
    if embedding is None:
        embedding = np.random.randn(512).astype(np.float32)
        embedding = embedding / np.linalg.norm(embedding)

    person = Person(
        full_name=data.get("full_name", "Desconocido"),
        cedula=data.get("cedula"),
        email=data.get("email"),
        phone=data.get("phone"),
        apartment=data.get("apartment"),
        person_type=PersonType(data.get("person_type", "visitor")),
        embedding=embedding.tolist(),
        photo_path=photo_path,
        state=StateType.IN,
        building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)

    result = await complete_registration(
        pending_id,
        person,
        db,
        visitor_card_number=data.get("visitor_card_number"),
        belongs_to=data.get("belongs_to"),
    )
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Pending registration not found")
    
    return {"status": "ok", "person_id": str(person.id)}


@router.post("/cancel/{pending_id}")
async def cancel(pending_id: str):
    """Cancel a pending request"""
    result = await cancel_pending(pending_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Pending request not found")
    return result
