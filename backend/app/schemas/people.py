from datetime import datetime
from uuid import UUID
from pydantic import BaseModel
from typing import Optional


class PersonResponse(BaseModel):
    id: UUID
    full_name: str
    cedula: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    apartment: Optional[str] = None
    photo_path: Optional[str] = None
    person_type: str
    state: str
    last_entry_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PersonCreateRequest(BaseModel):
    full_name: str
    cedula: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    apartment: Optional[str] = None
    person_type: str = "client"
    photo_data: Optional[str] = None


class PersonUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    cedula: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    apartment: Optional[str] = None
    person_type: Optional[str] = None
    photo_data: Optional[str] = None


class VisitorCreateRequest(BaseModel):
    temp_id: UUID
    full_name: str
    cedula: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    apartment: Optional[str] = None
    photo_data: Optional[str] = None


class PersonStatsResponse(BaseModel):
    total: int
    residents: int
    clients: int
    visitors: int
    inside: int
    outside: int