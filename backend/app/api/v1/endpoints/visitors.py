import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.ws_manager import ws_manager
from app.models.models import Event, EventType, Person, PersonType, StateType, TempUnknown
from app.schemas.people import PersonResponse, VisitorCreateRequest

router = APIRouter()


@router.post("/visitors", response_model=PersonResponse)
async def register_visitor(
    payload: VisitorCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Obtener embedding del temporal
    temp = await db.get(TempUnknown, payload.temp_id)
    if not temp:
        raise HTTPException(status_code=404, detail="Registro temporal no encontrado o expirado.")

    # 2. Crear persona con estado IN
    now = datetime.now(timezone.utc)
    person = Person(
        id=uuid.uuid4(),
        full_name=payload.full_name,
        cedula=payload.cedula,
        email=payload.email,
        phone=payload.phone,
        apartment=payload.apartment,
        embedding=temp.embedding,
        person_type=PersonType.visitor,
        state=StateType.IN,
        last_entry_at=now,
    )
    db.add(person)

    # 3. Registrar evento de entrada
    event = Event(
        id=uuid.uuid4(),
        person_id=person.id,
        event_type=EventType.entry,
        photo_path=temp.photo_path,
        timestamp=now,
    )
    db.add(event)

    # 4. Eliminar temporal
    await db.delete(temp)
    await db.commit()
    await db.refresh(person)

    # 5. Broadcast al dashboard
    await ws_manager.broadcast({
        "type": "entry",
        "person": {
            "id": str(person.id),
            "full_name": person.full_name,
            "apartment": person.apartment,
            "person_type": "visitor",
        },
        "duration": None,
        "timestamp": now.isoformat(),
    })

    return person
