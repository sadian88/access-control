import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str | None = None


class UserCreate(BaseModel):
    username: str
    email: EmailStr | None = None
    password: str
    full_name: str | None = None


class UserOut(BaseModel):
    id: str
    username: str
    email: str | None = None
    full_name: str | None = None
    is_active: bool
    is_superuser: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)

    @field_validator("id", mode="before")
    @classmethod
    def _uuid_to_str(cls, v):
        return str(v) if isinstance(v, uuid.UUID) else v

    @field_validator("created_at", mode="before")
    @classmethod
    def _datetime_to_str(cls, v):
        return v.isoformat() if isinstance(v, datetime) else v


class UserLogin(BaseModel):
    username: str
    password: str
