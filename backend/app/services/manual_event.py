import base64
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.ws_manager import ws_manager
from app.ml.face_engine import face_engine
from app.models.models import BelongsTo, Event, EventType, Person, PersonType, StateType
from app.schemas.manual_event import ManualEventRequest, ManualEventResponse


def _decode_frame(frame_b64: str) -> bytes:
    if "," in frame_b64:
        frame_b64 = frame_b64.split(",", 1)[1]
    return base64.b64decode(frame_b64)


def _save_photo(image_bytes: bytes, subfolder: str) -> str | None:
    try:
        folder = Path(settings.MEDIA_PATH) / subfolder
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4()}.jpg"
        (folder / filename).write_bytes(image_bytes)
        return str(Path(subfolder) / filename)
    except Exception:
        return None


async def manual_identify(frame_b64: str, db: AsyncSession) -> dict:
    """Identifica un rostro manualmente desde el admin.
    
    Retorna:
    - status: known | unknown | no_face
    - person: datos de la persona si es known
    - suggested_event_type: entry | exit según estado actual
    - last_entry_data: datos del último ingreso (para precargar en salidas)
    """
    image_bytes = _decode_frame(frame_b64)
    
    # Extraer embedding
    embedding = await face_engine.detect_and_embed_async(image_bytes)
    if embedding is None:
        return {"status": "no_face", "person": None, "suggested_event_type": None, "last_entry_data": None}
    
    embedding_list = embedding.tolist()
    
    # Buscar similitud
    stmt = (
        select(
            Person,
            Person.embedding.cosine_distance(embedding_list).label("distance"),
        )
        .order_by(Person.embedding.cosine_distance(embedding_list))
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.first()
    
    if row is not None:
        person, distance = row
        if distance < settings.SIMILARITY_THRESHOLD:
            suggested = "exit" if person.state == StateType.IN else "entry"
            
            # Buscar último evento de entrada para precargar datos en salidas
            last_entry_data = None
            if person.state == StateType.IN:
                from sqlalchemy import select as sa_select
                entry_result = await db.execute(
                    sa_select(Event)
                    .where(
                        Event.person_id == person.id,
                        Event.event_type == EventType.entry,
                    )
                    .order_by(Event.timestamp.desc())
                    .limit(1)
                )
                last_entry = entry_result.scalar_one_or_none()
                if last_entry:
                    last_entry_data = {
                        "visitor_card_number": last_entry.visitor_card_number,
                        "belongs_to": last_entry.belongs_to.value if last_entry.belongs_to else None,
                        "entry_zone": last_entry.entry_zone,
                        "has_equipment": last_entry.has_equipment,
                        "notes": last_entry.notes,
                    }
            
            return {
                "status": "known",
                "person": person,
                "suggested_event_type": suggested,
                "last_entry_data": last_entry_data,
            }
    
    return {"status": "unknown", "person": None, "suggested_event_type": None, "last_entry_data": None}


async def create_manual_event(data: ManualEventRequest, db: AsyncSession) -> ManualEventResponse:
    """Crea un evento manual desde el admin."""
    try:
        now = datetime.now(timezone.utc)
        photo_path = None
        
        if data.frame_b64:
            image_bytes = _decode_frame(data.frame_b64)
            photo_path = _save_photo(image_bytes, "events")
        
        belongs_enum = None
        if data.belongs_to:
            try:
                belongs_enum = BelongsTo(data.belongs_to)
            except ValueError:
                belongs_enum = None
        
        person = None
        
        if data.is_new_person:
            # Crear nueva persona
            embedding = None
            if data.frame_b64:
                image_bytes = _decode_frame(data.frame_b64)
                embedding = await face_engine.detect_and_embed_async(image_bytes)
            
            if embedding is None:
                # Fallback a embedding aleatorio si no hay frame o no detecta rostro
                embedding = np.random.randn(512).astype(np.float32)
                embedding = embedding / np.linalg.norm(embedding)
            
            # Guardar foto de la persona si hay frame
            person_photo = None
            if data.frame_b64:
                image_bytes = _decode_frame(data.frame_b64)
                person_photo = _save_photo(image_bytes, "people")
            
            person = Person(
                id=uuid.uuid4(),
                full_name=data.full_name or "Desconocido",
                cedula=data.cedula,
                phone=data.phone,
                apartment=data.apartment,
                photo_path=person_photo,
                person_type=PersonType(data.person_type),
                embedding=embedding.tolist(),
                state=StateType.IN if data.event_type == "entry" else StateType.OUT,
                last_entry_at=now if data.event_type == "entry" else None,
                building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            )
            db.add(person)
            await db.flush()
            await db.refresh(person)
        else:
            # Persona existente
            if not data.person_id:
                return ManualEventResponse(status="error", message="person_id requerido para persona existente")
            
            result = await db.execute(select(Person).where(Person.id == data.person_id))
            person = result.scalar_one_or_none()
            if not person:
                return ManualEventResponse(status="error", message="Persona no encontrada")
            
            # Actualizar estado
            if data.event_type == "entry":
                person.state = StateType.IN
                person.last_entry_at = now
            else:
                person.state = StateType.OUT
        
        # Crear evento
        event = Event(
            id=uuid.uuid4(),
            person_id=person.id,
            event_type=EventType(data.event_type),
            photo_path=photo_path,
            visitor_card_number=data.visitor_card_number,
            belongs_to=belongs_enum,
            entry_zone=data.entry_zone,
            has_equipment=data.has_equipment,
            notes=data.notes,
            building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            timestamp=now,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        
        # Broadcast WebSocket
        await ws_manager.broadcast({
            "type": data.event_type,
            "person": {
                "id": str(person.id),
                "full_name": person.full_name,
                "apartment": person.apartment,
                "person_type": person.person_type.value,
            },
            "duration": None,
            "timestamp": now.isoformat(),
        })
        
        return ManualEventResponse(
            status="ok",
            event_id=event.id,
            person_id=person.id,
            message=f"{'Ingreso' if data.event_type == 'entry' else 'Salida'} registrado: {person.full_name}",
        )
    
    except Exception as e:
        await db.rollback()
        import traceback
        traceback.print_exc()
        return ManualEventResponse(status="error", message=f"Error: {str(e)}")
