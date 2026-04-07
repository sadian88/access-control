from datetime import datetime, timedelta
from uuid import UUID
from pydantic import BaseModel


class EventResponse(BaseModel):
    id: UUID
    person_id: UUID | None
    person_name: str | None
    event_type: str
    photo_path: str | None
    stay_duration: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}
