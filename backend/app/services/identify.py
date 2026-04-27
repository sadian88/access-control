import base64
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.ws_manager import ws_manager
from app.ml.face_engine import face_engine
from app.models.models import Person, TempUnknown, StateType, Event, EventType, BelongsTo
from app.schemas.identify import IdentifyResponse, PersonInfo, ApprovalRequest
from app.services.state_machine import process_state


_pending_approvals: dict[str, dict] = {}
_pending_registrations: dict[str, dict] = {}


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


async def verify_liveness(challenge: str, challenge_frames: list[str], primary_image_bytes: bytes) -> bool:
    """Verify liveness by checking movement between frames using face position"""
    if not challenge_frames:
        return False
    
    try:
        import numpy as np
        
        def get_face_center(embedding) -> tuple:
            if embedding is None or len(embedding) < 512:
                return (None, None)
            return (np.mean(embedding[:256]), np.mean(embedding[256:512]))
        
        primary_embedding = await face_engine.detect_and_embed_async(primary_image_bytes)
        if primary_embedding is None:
            print("[Liveness] No face detected in primary frame")
            return False
        
        primary_center = get_face_center(primary_embedding)
        if primary_center[0] is None:
            return False
        
        centers = [primary_center]
        
        for frame_b64 in challenge_frames[:3]:
            frame_bytes = _decode_frame(frame_b64)
            emb = await face_engine.detect_and_embed_async(frame_bytes)
            if emb is not None:
                center = get_face_center(emb)
                if center[0] is not None:
                    centers.append(center)
        
        if len(centers) < 2:
            print("[Liveness] Not enough frames with faces")
            return False
        
        total_movement = 0
        for i in range(len(centers) - 1):
            dx = centers[i+1][0] - centers[i][0]
            dy = centers[i+1][1] - centers[i][1]
            movement = np.sqrt(dx*dx + dy*dy)
            total_movement += movement
        
        avg_movement = total_movement / (len(centers) - 1)
        
        print(f"[Liveness] Challenge: {challenge}, Frames: {len(centers)}, Avg face movement: {avg_movement:.6f} (threshold: 0.0001)")
        
        MIN_MOVEMENT = 0.0001
        return avg_movement >= MIN_MOVEMENT
        
    except Exception as e:
        print(f"[Liveness] Verification error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def _get_last_entry_event(person_id: str, db: AsyncSession) -> Event | None:
    """Get the most recent entry event for a person to retrieve card info."""
    result = await db.execute(
        select(Event)
        .where(
            Event.person_id == person_id,
            Event.event_type == EventType.entry,
        )
        .order_by(Event.timestamp.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def identify_face(frame_b64: str, db: AsyncSession) -> IdentifyResponse:
    image_bytes = _decode_frame(frame_b64)

    # Check if there's a pending approval
    if _pending_approvals:
        first_pending = list(_pending_approvals.values())[0]
        pending_id_to_process = list(_pending_approvals.keys())[0]
        
        if first_pending.get("action") == "approve":
            person_data = first_pending["person"]
            stmt = select(Person).where(Person.id == person_data["id"])
            result = await db.execute(stmt)
            person = result.scalar_one_or_none()
            if person:
                photo_path = _save_photo(image_bytes, "events")
                
                # Get card info from pending approval
                card_number = first_pending.get("visitor_card_number")
                belongs_to = first_pending.get("belongs_to")
                
                state_result = await process_state(
                    person, photo_path, db,
                    visitor_card_number=card_number,
                    belongs_to=belongs_to,
                )
                
                del _pending_approvals[pending_id_to_process]
                await ws_manager.broadcast({
                    "type": state_result.event_type,
                    "person": {
                        "id": str(person.id),
                        "full_name": person.full_name,
                        "apartment": person.apartment,
                        "person_type": person.person_type.value,
                    },
                    "duration": state_result.duration,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                return IdentifyResponse(
                    status="known",
                    event_type=state_result.event_type,
                    message=state_result.message,
                    duration=state_result.duration,
                    person=PersonInfo(
                        id=person.id,
                        full_name=person.full_name,
                        apartment=person.apartment,
                        person_type=person.person_type.value,
                        state=person.state.value,
                        photo_path=person.photo_path,
                    ),
                )
        elif first_pending.get("action") == "deny":
            del _pending_approvals[pending_id_to_process]
            return IdentifyResponse(
                status="unknown",
                event_type="unknown",
                message="Acceso denegado por el guardia",
            )
        else:
            return IdentifyResponse(
                status="pending_approval",
                event_type=first_pending.get("event_type"),
                message="Esperando aprobación del guardia...",
                pending_id=pending_id_to_process,
            )

    # Check pending registrations
    if _pending_registrations:
        first_reg = list(_pending_registrations.values())[0]
        reg_id = list(_pending_registrations.keys())[0]
        
        if first_reg.get("registered"):
            person = first_reg.get("person")
            if person:
                del _pending_registrations[reg_id]
                
                # Create entry event for the newly registered person with card info
                card_number = first_reg.get("visitor_card_number")
                belongs_to = first_reg.get("belongs_to")
                if belongs_to:
                    try:
                        belongs_enum = BelongsTo(belongs_to)
                    except ValueError:
                        belongs_enum = None
                else:
                    belongs_enum = None
                
                event = Event(
                    id=uuid.uuid4(),
                    person_id=person.id,
                    event_type=EventType.entry,
                    visitor_card_number=card_number,
                    belongs_to=belongs_enum,
                    building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(event)
                await db.commit()
                
                await ws_manager.broadcast({
                    "type": "entry",
                    "person": {
                        "id": str(person.id),
                        "full_name": person.full_name,
                        "apartment": person.apartment,
                        "person_type": person.person_type.value,
                    },
                    "duration": None,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                return IdentifyResponse(
                    status="known",
                    event_type="entry",
                    message=f"Bienvenido, {person.full_name}",
                    person=PersonInfo(
                        id=person.id,
                        full_name=person.full_name,
                        apartment=person.apartment,
                        person_type=person.person_type.value,
                        state=person.state.value,
                        photo_path=person.photo_path,
                    ),
                )
        return IdentifyResponse(
            status="pending_registration",
            event_type="unknown",
            message="Complete el registro en el admin...",
            pending_id=reg_id,
        )

    # Check for pending registrations by frame match
    for pending_id, pending in list(_pending_registrations.items()):
        if pending.get("frame_b64") == frame_b64:
            if pending.get("registered"):
                person = pending["person"]
                del _pending_registrations[pending_id]
                
                # Create entry event for the newly registered person
                card_number = pending.get("visitor_card_number")
                belongs_to = pending.get("belongs_to")
                if belongs_to:
                    try:
                        belongs_enum = BelongsTo(belongs_to)
                    except ValueError:
                        belongs_enum = None
                else:
                    belongs_enum = None
                
                event = Event(
                    id=uuid.uuid4(),
                    person_id=person.id,
                    event_type=EventType.entry,
                    visitor_card_number=card_number,
                    belongs_to=belongs_enum,
                    building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(event)
                await db.commit()
                
                await ws_manager.broadcast({
                    "type": "entry",
                    "person": {
                        "id": str(person.id),
                        "full_name": person.full_name,
                        "apartment": person.apartment,
                        "person_type": person.person_type.value,
                    },
                    "duration": None,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                return IdentifyResponse(
                    status="known",
                    event_type="entry",
                    message=f"Bienvenido, {person.full_name}",
                    person=PersonInfo(
                        id=person.id,
                        full_name=person.full_name,
                        apartment=person.apartment,
                        person_type=person.person_type.value,
                        state=person.state.value,
                        photo_path=person.photo_path,
                    ),
                )

    # 1. Extraer embedding
    embedding = await face_engine.detect_and_embed_async(image_bytes)
    if embedding is None:
        return IdentifyResponse(status="no_face", event_type="no_face", message="")

    embedding_list = embedding.tolist()

    # 2. Buscar similitud en pgvector
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

    # 3. Persona conocida → ejecutar máquina de estados
    if row is not None:
        person, distance = row
        print(f"[DEBUG] Mejor match: '{person.full_name}' | distancia: {distance:.4f} | umbral: {settings.SIMILARITY_THRESHOLD}")
        if distance < settings.SIMILARITY_THRESHOLD:
            pending_id = str(uuid.uuid4())
            photo_path = _save_photo(image_bytes, "events")
            
            # Determine event type WITHOUT changing state
            if person.state == StateType.OUT:
                event_type = "entry"
                message = f"¡Bienvenido, {person.full_name}!"
            else:
                event_type = "exit"
                message = f"¡Hasta luego, {person.full_name}!"

            # For exit: look up last entry event to get card info for display
            last_entry_info = {}
            if event_type == "exit":
                last_entry = await _get_last_entry_event(str(person.id), db)
                if last_entry:
                    last_entry_info = {
                        "visitor_card_number": last_entry.visitor_card_number,
                        "belongs_to": last_entry.belongs_to.value if last_entry.belongs_to else None,
                    }

            # Guardar como pending approval
            _pending_approvals[pending_id] = {
                "person": {
                    "id": str(person.id),
                    "full_name": person.full_name,
                    "apartment": person.apartment,
                    "person_type": person.person_type.value,
                },
                "event_type": event_type,
                "message": message,
                "photo_path": photo_path,
                "frame_b64": frame_b64,
                **last_entry_info,
            }

            # Broadcast para approval en admin
            await ws_manager.broadcast({
                "type": "pending_approval",
                "pending_id": pending_id,
                "person": {
                    "id": str(person.id),
                    "full_name": person.full_name,
                    "apartment": person.apartment,
                    "person_type": person.person_type.value,
                    "photo_path": person.photo_path,
                },
                "event_type": event_type,
                "message": message,
                "photo_url": f"/media/{photo_path}" if photo_path else None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **last_entry_info,
            })

            return IdentifyResponse(
                status="pending_approval",
                event_type=event_type,
                message="Esperando aprobación del guardia...",
                person=PersonInfo(
                    id=person.id,
                    full_name=person.full_name,
                    apartment=person.apartment,
                    person_type=person.person_type.value,
                    state=person.state.value,
                    photo_path=person.photo_path,
                ),
                pending_id=pending_id,
            )

    # 4. Desconocido — guardar imagen y registro temporal
    photo_path = _save_photo(image_bytes, "temp")
    temp = TempUnknown(
        id=uuid.uuid4(),
        photo_path=photo_path,
        embedding=embedding_list,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(temp)
    await db.commit()
    await db.refresh(temp)

    # Guardar como pending registration
    pending_id = str(uuid.uuid4())
    _pending_registrations[pending_id] = {
        "temp_id": str(temp.id),
        "photo_path": photo_path,
        "frame_b64": frame_b64,
    }

    # Broadcast alerta de desconocido al dashboard
    photo_url = f"/media/{photo_path}" if photo_path else None
    await ws_manager.broadcast({
        "type": "pending_registration",
        "pending_id": pending_id,
        "temp_id": str(temp.id),
        "photo_url": photo_url,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return IdentifyResponse(
        status="pending_registration",
        event_type="unknown",
        message="Persona no registrada. Complete el registro...",
        temp_id=temp.id,
        pending_id=pending_id,
    )


async def handle_approval(pending_id: str, action: str, db: AsyncSession, visitor_card_number: str | None = None, belongs_to: str | None = None) -> dict:
    """Handle approval or denial from admin"""
    if pending_id in _pending_approvals:
        pending = _pending_approvals[pending_id]
        
        # Delete the captured photo after approval/deny
        photo_path = pending.get("photo_path")
        if photo_path:
            try:
                from app.core.config import settings
                full_path = Path(settings.MEDIA_PATH) / photo_path
                if full_path.exists():
                    full_path.unlink()
            except Exception as e:
                print(f"[Cleanup] Error deleting photo: {e}")
        
        pending["action"] = action
        
        # Store card info for entry approvals
        if action == "approve" and pending.get("event_type") == "entry":
            pending["visitor_card_number"] = visitor_card_number
            pending["belongs_to"] = belongs_to
        
        return {"status": "ok", "action": action}
    return {"status": "not_found"}


async def complete_registration(pending_id: str, person: Person, db: AsyncSession, visitor_card_number: str | None = None, belongs_to: str | None = None) -> dict:
    """Mark registration as complete"""
    if pending_id in _pending_registrations:
        _pending_registrations[pending_id]["registered"] = True
        _pending_registrations[pending_id]["person"] = person
        _pending_registrations[pending_id]["visitor_card_number"] = visitor_card_number
        _pending_registrations[pending_id]["belongs_to"] = belongs_to
        await ws_manager.broadcast({
            "type": "entry",
            "person": {
                "id": str(person.id),
                "full_name": person.full_name,
                "apartment": person.apartment,
                "person_type": person.person_type.value,
            },
            "duration": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return {"status": "ok"}
    return {"status": "not_found"}


async def cancel_pending(pending_id: str) -> dict:
    """Cancel a pending request"""
    if pending_id in _pending_approvals:
        pending = _pending_approvals[pending_id]
        # Delete the captured photo
        photo_path = pending.get("photo_path")
        if photo_path:
            try:
                from app.core.config import settings
                full_path = Path(settings.MEDIA_PATH) / photo_path
                if full_path.exists():
                    full_path.unlink()
            except Exception as e:
                print(f"[Cleanup] Error deleting photo: {e}")
        del _pending_approvals[pending_id]
        return {"status": "ok", "cancelled": "approval"}
    if pending_id in _pending_registrations:
        del _pending_registrations[pending_id]
        return {"status": "ok", "cancelled": "registration"}
    return {"status": "not_found"}
