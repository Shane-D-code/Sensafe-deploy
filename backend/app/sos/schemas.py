from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.models import SOSStatus, UserAbility
from pydantic import BaseModel, Field

class SOSCreate(BaseModel):
    """Schema for creating a new SOS alert."""
    ability: UserAbility
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    battery: int = Field(..., ge=0, le=100)
    status: SOSStatus


class SOSResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    ability: UserAbility
    lat: float
    lng: float
    battery: int
    status: SOSStatus
    created_at: datetime

    class Config:
        from_attributes = True


class SOSListResponse(BaseModel):
    """Schema for paginated SOS list."""
    sos_alerts: list[SOSResponse]
    total: int
    page: int
    page_size: int
