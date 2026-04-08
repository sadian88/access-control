import enum
import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Interval, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PersonType(str, enum.Enum):
    client = "client"
    visitor = "visitor"
    employee = "employee"


class StateType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"


class EventType(str, enum.Enum):
    entry = "entry"
    exit = "exit"
    unknown = "unknown"


class Person(Base):
    __tablename__ = "people"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    cedula: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    apartment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list] = mapped_column(Vector(512), nullable=False)
    person_type: Mapped[PersonType] = mapped_column(
        Enum(PersonType, name="persontype"), nullable=False
    )
    state: Mapped[StateType] = mapped_column(
        Enum(StateType, name="statetype"), nullable=False, default=StateType.OUT
    )
    last_entry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    events: Mapped[list["Event"]] = relationship(back_populates="person")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("people.id"), nullable=True
    )
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="eventtype"), nullable=False
    )
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    stay_duration: Mapped[object | None] = mapped_column(Interval, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    person: Mapped["Person | None"] = relationship(back_populates="events")


class TempUnknown(Base):
    __tablename__ = "temp_unknowns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    photo_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list] = mapped_column(Vector(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
