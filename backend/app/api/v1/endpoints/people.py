import base64
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Person, PersonType, StateType
from app.schemas.people import (
    PersonResponse,
    PersonCreateRequest,
    PersonUpdateRequest,
    VisitorCreateRequest,
    PersonStatsResponse,
)

router = APIRouter()


def _save_photo(image_bytes: bytes, subfolder: str = "people") -> str | None:
    try:
        folder = Path(settings.MEDIA_PATH) / subfolder
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid.uuid4()}.jpg"
        (folder / filename).write_bytes(image_bytes)
        return str(Path(subfolder) / filename)
    except Exception:
        return None


def _decode_photo(photo_data: str) -> bytes | None:
    if not photo_data:
        return None
    if "," in photo_data:
        photo_data = photo_data.split(",", 1)[1]
    try:
        return base64.b64decode(photo_data)
    except Exception:
        return None


@router.get("/people", response_model=list[PersonResponse])
async def list_people(
    state: str | None = Query(None, description="Filtrar por estado: IN | OUT"),
    person_type: str | None = Query(None, description="Filtrar por tipo: resident | visitor"),
    search: str | None = Query(None, description="Buscar por nombre o cédula"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Person).order_by(Person.full_name)

    if state:
        stmt = stmt.where(Person.state == StateType(state))
    if person_type:
        stmt = stmt.where(Person.person_type == PersonType(person_type))
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            (Person.full_name.ilike(search_filter)) | (Person.cedula.ilike(search_filter))
        )

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/people/stats", response_model=PersonStatsResponse)
async def get_people_stats(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(select(func.count(Person.id)))
    total = total_result.scalar() or 0

    residents_result = await db.execute(
        select(func.count(Person.id)).where(Person.person_type == PersonType.resident)
    )
    residents = residents_result.scalar() or 0

    clients_result = await db.execute(
        select(func.count(Person.id)).where(Person.person_type == PersonType.client)
    )
    clients = clients_result.scalar() or 0

    visitors_result = await db.execute(
        select(func.count(Person.id)).where(Person.person_type == PersonType.visitor)
    )
    visitors = visitors_result.scalar() or 0

    inside_result = await db.execute(
        select(func.count(Person.id)).where(Person.state == StateType.IN)
    )
    inside = inside_result.scalar() or 0

    outside_result = await db.execute(
        select(func.count(Person.id)).where(Person.state == StateType.OUT)
    )
    outside = outside_result.scalar() or 0

    return PersonStatsResponse(
        total=total,
        residents=residents,
        clients=clients,
        visitors=visitors,
        inside=inside,
        outside=outside,
    )


@router.get("/people/{person_id}", response_model=PersonResponse)
async def get_person(person_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return person


@router.post("/people", response_model=PersonResponse, status_code=201)
async def create_person(person_data: PersonCreateRequest, db: AsyncSession = Depends(get_db)):
    import numpy as np

    photo_path = None
    if person_data.photo_data:
        image_bytes = _decode_photo(person_data.photo_data)
        if image_bytes:
            photo_path = _save_photo(image_bytes)

    embedding = np.random.randn(512).astype(np.float32)
    embedding = embedding / np.linalg.norm(embedding)

    person = Person(
        full_name=person_data.full_name,
        cedula=person_data.cedula,
        email=person_data.email,
        phone=person_data.phone,
        apartment=person_data.apartment,
        photo_path=photo_path,
        person_type=PersonType(person_data.person_type),
        embedding=embedding.tolist(),
        state=StateType.OUT,
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


@router.patch("/people/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: str, person_data: PersonUpdateRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    update_data = person_data.model_dump(exclude_unset=True, exclude={'photo_data'})
    
    if person_data.photo_data:
        image_bytes = _decode_photo(person_data.photo_data)
        if image_bytes:
            photo_path = _save_photo(image_bytes)
            if photo_path:
                update_data['photo_path'] = photo_path

    for key, value in update_data.items():
        if key == "person_type" and value:
            setattr(person, key, PersonType(value))
        elif value is not None:
            setattr(person, key, value)

    await db.commit()
    await db.refresh(person)
    return person


@router.delete("/people/{person_id}", status_code=204)
async def delete_person(person_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    await db.delete(person)
    await db.commit()
    return None