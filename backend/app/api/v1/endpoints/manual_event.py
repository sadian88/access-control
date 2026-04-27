from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.manual_event import (
    ManualEventRequest,
    ManualEventResponse,
    ManualIdentifyRequest,
    ManualIdentifyResponse,
    PersonInfo,
)
from app.services.manual_event import create_manual_event, manual_identify

router = APIRouter()


@router.post("/manual-identify", response_model=ManualIdentifyResponse)
async def identify_manual(
    payload: ManualIdentifyRequest,
    db: AsyncSession = Depends(get_db),
) -> ManualIdentifyResponse:
    """Identifica un rostro manualmente desde el admin.
    
    No crea pending approvals ni eventos. Solo identifica y sugiere el tipo de evento.
    """
    result = await manual_identify(payload.frame_b64, db)
    
    person_info = None
    if result.get("person"):
        p = result["person"]
        person_info = PersonInfo(
            id=p.id,
            full_name=p.full_name,
            cedula=p.cedula,
            phone=p.phone,
            apartment=p.apartment,
            photo_path=p.photo_path,
            person_type=p.person_type.value,
            state=p.state.value,
        )
    
    last_entry_data = None
    if result.get("last_entry_data"):
        d = result["last_entry_data"]
        last_entry_data = {
            "visitor_card_number": d.get("visitor_card_number"),
            "belongs_to": d.get("belongs_to"),
            "entry_zone": d.get("entry_zone"),
            "has_equipment": d.get("has_equipment"),
            "notes": d.get("notes"),
        }
    
    return ManualIdentifyResponse(
        status=result["status"],
        person=person_info,
        suggested_event_type=result.get("suggested_event_type"),
        last_entry_data=last_entry_data,
    )


@router.post("/manual-event", response_model=ManualEventResponse)
async def event_manual(
    payload: ManualEventRequest,
    db: AsyncSession = Depends(get_db),
) -> ManualEventResponse:
    """Crea un evento manual desde el admin.
    
    Permite registrar ingreso/salida de personas conocidas o nuevas,
    incluyendo datos adicionales del evento.
    """
    result = await create_manual_event(payload, db)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.message)
    return result
