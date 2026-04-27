from datetime import datetime, timedelta
from uuid import UUID
from pydantic import BaseModel, field_validator


class EventResponse(BaseModel):
    id: UUID
    person_id: UUID | None
    person_name: str | None
    event_type: str
    photo_path: str | None
    stay_duration: str | None
    visitor_card_number: str | None
    belongs_to: str | None
    entry_zone: str | None
    has_equipment: bool | None
    notes: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}

    @field_validator("belongs_to", mode="before")
    @classmethod
    def _enum_to_str(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return v
        return v.value
