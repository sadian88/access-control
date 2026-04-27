from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Event, Person, EventType
from app.schemas.events import EventResponse

router = APIRouter()


def safe_format_duration(delta: timedelta | None) -> str | None:
    """Convierte un timedelta en formato legible, manejando tipos."""
    if delta is None:
        return None
    if not isinstance(delta, timedelta):
        return None
    total_seconds = int(delta.total_seconds())
    if total_seconds < 0:
        total_seconds = 0
    hours, remainder = divmod(total_seconds, 3600)
    minutes = remainder // 60
    if hours > 0 and minutes > 0:
        return f"{hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h"
    return f"{minutes}m"


@router.get("/events", response_model=list[EventResponse])
async def list_events(
    limit: int = Query(50, le=50000),
    offset: int = Query(0),
    event_type: str | None = Query(None, description="Filtrar por tipo: entry | exit | unknown"),
    person_id: str | None = Query(None, description="Filtrar por persona"),
    start_date: datetime | None = Query(None, description="Fecha inicio"),
    end_date: datetime | None = Query(None, description="Fecha fin"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Event)
        .options(joinedload(Event.person))
        .order_by(Event.timestamp.desc())
    )

    if event_type:
        stmt = stmt.where(Event.event_type == EventType(event_type))
    if person_id:
        stmt = stmt.where(Event.person_id == person_id)
    if start_date:
        stmt = stmt.where(Event.timestamp >= start_date)
    if end_date:
        stmt = stmt.where(Event.timestamp <= end_date)

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    events = result.scalars().all()

    return [
        EventResponse(
            id=e.id,
            person_id=e.person_id,
            person_name=e.person.full_name if e.person else None,
            event_type=e.event_type.value,
            photo_path=e.photo_path,
            stay_duration=safe_format_duration(e.stay_duration),
            visitor_card_number=e.visitor_card_number,
            belongs_to=e.belongs_to.value if e.belongs_to else None,
            entry_zone=e.entry_zone,
            has_equipment=e.has_equipment,
            notes=e.notes,
            timestamp=e.timestamp,
        )
        for e in events
    ]


@router.get("/events/stats")
async def get_event_stats(
    days: int = Query(7, le=90, description="Días para estadísticas"),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)

    total_result = await db.execute(
        select(func.count(Event.id)).where(Event.timestamp >= start_date)
    )
    total = total_result.scalar() or 0

    entry_result = await db.execute(
        select(func.count(Event.id)).where(
            and_(Event.event_type == EventType.entry, Event.timestamp >= start_date)
        )
    )
    entry_count = entry_result.scalar() or 0

    exit_result = await db.execute(
        select(func.count(Event.id)).where(
            and_(Event.event_type == EventType.exit, Event.timestamp >= start_date)
        )
    )
    exit_count = exit_result.scalar() or 0

    unknown_result = await db.execute(
        select(func.count(Event.id)).where(
            and_(Event.event_type == EventType.unknown, Event.timestamp >= start_date)
        )
    )
    unknown_count = unknown_result.scalar() or 0

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_result = await db.execute(
        select(func.count(Event.id)).where(Event.timestamp >= today_start)
    )
    today_count = today_result.scalar() or 0

    return {
        "total": total,
        "entries": entry_count,
        "exits": exit_count,
        "unknown": unknown_count,
        "today": today_count,
        "days": days,
    }


@router.get("/events/by-day")
async def get_events_by_day(
    days: int = Query(7, le=30, description="Días para gráfico"),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    results = []

    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        entry_result = await db.execute(
            select(func.count(Event.id)).where(
                and_(
                    Event.event_type == EventType.entry,
                    Event.timestamp >= day_start,
                    Event.timestamp < day_end,
                )
            )
        )
        entry_count = entry_result.scalar() or 0

        exit_result = await db.execute(
            select(func.count(Event.id)).where(
                and_(
                    Event.event_type == EventType.exit,
                    Event.timestamp >= day_start,
                    Event.timestamp < day_end,
                )
            )
        )
        exit_count = exit_result.scalar() or 0

        results.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day": day_start.strftime("%a"),
            "entries": entry_count,
            "exits": exit_count,
        })

    return results


@router.get("/events/count")
async def count_events(
    event_type: str | None = Query(None, description="Filtrar por tipo"),
    start_date: datetime | None = Query(None, description="Fecha inicio"),
    end_date: datetime | None = Query(None, description="Fecha fin"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(func.count(Event.id))

    if event_type:
        stmt = stmt.where(Event.event_type == EventType(event_type))
    if start_date:
        stmt = stmt.where(Event.timestamp >= start_date)
    if end_date:
        stmt = stmt.where(Event.timestamp <= end_date)

    result = await db.execute(stmt)
    return {"count": result.scalar() or 0}


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).options(joinedload(Event.person)).where(Event.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    return EventResponse(
        id=event.id,
        person_id=event.person_id,
        person_name=event.person.full_name if event.person else None,
        event_type=event.event_type.value,
        photo_path=event.photo_path,
        stay_duration=safe_format_duration(event.stay_duration),
        visitor_card_number=event.visitor_card_number,
        belongs_to=event.belongs_to.value if event.belongs_to else None,
        entry_zone=event.entry_zone,
        has_equipment=event.has_equipment,
        notes=event.notes,
        timestamp=event.timestamp,
    )
