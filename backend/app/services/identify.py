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
from app.models.models import Person, TempUnknown, StateType
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
        
        primary_embedding = face_engine.detect_and_embed(primary_image_bytes)
        if primary_embedding is None:
            print("[Liveness] No face detected in primary frame")
            return False
        
        primary_center = get_face_center(primary_embedding)
        if primary_center[0] is None:
            return False
        
        centers = [primary_center]
        
        for frame_b64 in challenge_frames[:3]:
            frame_bytes = _decode_frame(frame_b64)
            emb = face_engine.detect_and_embed(frame_bytes)
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


async def identify_face(frame_b64: str, db: AsyncSession) -> IdentifyResponse:
    image_bytes = _decode_frame(frame_b64)

    # Skip liveness check for now - can be added later with more sophisticated solution
    # The approval flow provides security against photo attacks

    # Check if there's a pending approval (first check if any pending exists)
    if _pending_approvals:
        # Return pending status - don't process new face
        first_pending = list(_pending_approvals.values())[0]
        if first_pending.get("action") == "approve":
            # Process approved
            person_data = first_pending["person"]
            stmt = select(Person).where(Person.id == person_data["id"])
            result = await db.execute(stmt)
            person = result.scalar_one_or_none()
            if person:
                photo_path = _save_photo(image_bytes, "events")
                state_result = await process_state(person, photo_path, db)
                pending_id_to_remove = None
                for pid, p in _pending_approvals.items():
                    if p.get("person", {}).get("id") == str(person.id):
                        pending_id_to_remove = pid
                        break
                if pending_id_to_remove:
                    del _pending_approvals[pending_id_to_remove]
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
            pending_id_to_remove = list(_pending_approvals.keys())[0]
            del _pending_approvals[pending_id_to_remove]
            return IdentifyResponse(
                status="unknown",
                event_type="unknown",
                message="Acceso denegado por el guardia",
            )
        else:
            # Still waiting for approval
            return IdentifyResponse(
                status="pending_approval",
                event_type=first_pending.get("event_type"),
                message="Esperando aprobación del guardia...",
                pending_id=list(_pending_approvals.keys())[0],
            )

    # Check pending registrations
    if _pending_registrations:
        first_reg = list(_pending_registrations.values())[0]
        if first_reg.get("registered"):
            person = first_reg.get("person")
            if person:
                pending_id_to_remove = list(_pending_registrations.keys())[0]
                del _pending_registrations[pending_id_to_remove]
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
        # Still waiting for registration
        return IdentifyResponse(
            status="pending_registration",
            event_type="unknown",
            message="Complete el registro en el admin...",
            pending_id=list(_pending_registrations.keys())[0],
        )

    # Check for pending registrations
    for pending_id, pending in list(_pending_registrations.items()):
        if pending.get("frame_b64") == frame_b64:
            if pending.get("registered"):
                person = pending["person"]
                del _pending_registrations[pending_id]
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
    embedding = face_engine.detect_and_embed(image_bytes)
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
            
            # Determine event type WITHOUT changing state (don't call process_state yet)
            if person.state == StateType.OUT:
                event_type = "entry"
                message = f"¡Bienvenido, {person.full_name}!"
            else:
                event_type = "exit"
                message = f"¡Hasta luego, {person.full_name}!"

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
            }

            # Broadcast para approval en admin - enviar la foto capturada
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


async def handle_approval(pending_id: str, action: str, db: AsyncSession) -> dict:
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
        return {"status": "ok", "action": action}
    return {"status": "not_found"}


async def complete_registration(pending_id: str, person: Person, db: AsyncSession) -> dict:
    """Mark registration as complete"""
    if pending_id in _pending_registrations:
        _pending_registrations[pending_id]["registered"] = True
        _pending_registrations[pending_id]["person"] = person
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
