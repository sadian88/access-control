import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.utils import format_duration
from app.models.models import Event, EventType, Person, StateType, BelongsTo

# Cache en memoria para debounce: {person_id_str: last_processed_datetime}
_debounce_cache: dict[str, datetime] = {}


def _is_debounced(person_id: uuid.UUID) -> bool:
    last = _debounce_cache.get(str(person_id))
    if last is None:
        return False
    elapsed = (datetime.now(timezone.utc) - last).total_seconds()
    return elapsed < settings.DEBOUNCE_SECONDS


def _mark_processed(person_id: uuid.UUID) -> None:
    _debounce_cache[str(person_id)] = datetime.now(timezone.utc)


class StateResult:
    event_type: Literal["entry", "exit", "debounced"]
    message: str
    duration: str | None

    def __init__(
        self,
        event_type: Literal["entry", "exit", "debounced"],
        message: str,
        duration: str | None = None,
    ):
        self.event_type = event_type
        self.message = message
        self.duration = duration


async def process_state(
    person: Person,
    photo_path: str | None,
    db: AsyncSession,
    visitor_card_number: str | None = None,
    belongs_to: str | None = None,
) -> StateResult:
    """
    Evalúa el estado actual de la persona y ejecuta la transición correspondiente.
    Registra el evento en la tabla events.
    Aplica debounce para evitar doble procesamiento.
    """
    if _is_debounced(person.id):
        return StateResult(
            event_type="debounced",
            message="",
        )

    _mark_processed(person.id)
    now = datetime.now(timezone.utc)

    # Resolve belongs_to enum if provided
    belongs_enum = None
    if belongs_to:
        try:
            belongs_enum = BelongsTo(belongs_to)
        except ValueError:
            belongs_enum = None

    if person.state == StateType.OUT:
        # Flujo de entrada
        person.state = StateType.IN
        person.last_entry_at = now

        event = Event(
            id=uuid.uuid4(),
            person_id=person.id,
            event_type=EventType.entry,
            photo_path=photo_path,
            visitor_card_number=visitor_card_number,
            belongs_to=belongs_enum,
            building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            timestamp=now,
        )
        db.add(event)
        await db.commit()

        return StateResult(
            event_type="entry",
            message=f"¡Bienvenido, {person.full_name}!",
        )

    else:
        # Flujo de salida
        duration_str: str | None = None
        stay_duration = None

        if person.last_entry_at:
            # last_entry_at puede ser naive si vino de DB sin timezone
            entry = person.last_entry_at
            if entry.tzinfo is None:
                entry = entry.replace(tzinfo=timezone.utc)
            stay_duration = now - entry
            duration_str = format_duration(stay_duration)

        person.state = StateType.OUT

        event = Event(
            id=uuid.uuid4(),
            person_id=person.id,
            event_type=EventType.exit,
            photo_path=photo_path,
            stay_duration=stay_duration,
            visitor_card_number=visitor_card_number,
            belongs_to=belongs_enum,
            building_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            timestamp=now,
        )
        db.add(event)
        await db.commit()

        message = f"¡Hasta luego, {person.full_name}!"
        if duration_str:
            message += f" Estuviste {duration_str}."

        return StateResult(
            event_type="exit",
            message=message,
            duration=duration_str,
        )
