from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class IdentifyRequest(BaseModel):
    frame_b64: str
    camera_id: str = "porteria_1"


class PersonInfo(BaseModel):
    id: UUID
    full_name: str
    apartment: str | None
    person_type: str
    state: str
    photo_path: str | None = None


class IdentifyResponse(BaseModel):
    status: Literal["known", "unknown", "no_face", "debounced", "pending_approval", "pending_registration", "liveness_failed"]
    event_type: Literal["entry", "exit", "unknown", "debounced", "no_face"] | None = None
    message: str
    duration: str | None = None
    person: PersonInfo | None = None
    temp_id: UUID | None = None
    pending_id: str | None = None

    def get_event_type(self) -> str:
        if self.event_type:
            return self.event_type
        return "unknown"


class ApprovalRequest(BaseModel):
    action: Literal["approve", "deny"]
    visitor_card_number: str | None = None
    belongs_to: Literal["UNFINET", "IFX", "OTRO"] | None = None
