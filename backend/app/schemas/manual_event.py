from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ManualIdentifyRequest(BaseModel):
    frame_b64: str


class LastEntryData(BaseModel):
    visitor_card_number: str | None = None
    belongs_to: str | None = None
    entry_zone: str | None = None
    has_equipment: bool | None = None
    notes: str | None = None


class ManualIdentifyResponse(BaseModel):
    status: Literal["known", "unknown", "no_face"]
    person: "PersonInfo | None" = None
    suggested_event_type: Literal["entry", "exit"] | None = None
    last_entry_data: LastEntryData | None = None


class PersonInfo(BaseModel):
    id: UUID
    full_name: str
    cedula: str | None = None
    phone: str | None = None
    apartment: str | None = None
    photo_path: str | None = None
    person_type: str
    state: str


class ManualEventRequest(BaseModel):
    frame_b64: str | None = None
    person_id: UUID | None = None
    is_new_person: bool = False

    # Datos de nueva persona
    full_name: str | None = None
    cedula: str | None = None
    phone: str | None = None
    apartment: str | None = None
    person_type: Literal["client", "visitor", "employee"] = "visitor"

    # Datos del evento
    event_type: Literal["entry", "exit"]
    visitor_card_number: str | None = None
    belongs_to: Literal["UNFINET", "IFX", "OTRO"] | None = None
    entry_zone: str | None = None
    has_equipment: bool = False
    notes: str | None = None


class ManualEventResponse(BaseModel):
    status: Literal["ok", "error"]
    event_id: UUID | None = None
    person_id: UUID | None = None
    message: str


# Forward reference resolution
ManualIdentifyResponse.model_rebuild()
