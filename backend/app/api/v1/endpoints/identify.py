import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.ws_manager import ws_manager
from app.models.models import Person, PersonType, StateType
from app.schemas.identify import IdentifyRequest, IdentifyResponse, ApprovalRequest
from app.services.identify import identify_face, handle_approval, complete_registration, cancel_pending, _save_photo

router = APIRouter()


@router.post("/identify", response_model=IdentifyResponse)
async def identify(
    payload: IdentifyRequest,
    db: AsyncSession = Depends(get_db),
) -> IdentifyResponse:
    return await identify_face(payload.frame_b64, db)


@router.post("/approve/{pending_id}")
async def approve(
    pending_id: str,
    action: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    """Approve or deny access for a pending person"""
    result = await handle_approval(pending_id, action.action, db)
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
        embedding = face_engine.detect_and_embed(image_bytes)
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
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)

    result = await complete_registration(pending_id, person, db)
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
