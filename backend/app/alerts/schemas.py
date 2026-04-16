from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from enum import Enum

from app.db.models import AlertSeverity


class AlertType(str, Enum):
    GENERAL = "GENERAL"
    INCIDENT = "INCIDENT"
    WEATHER = "WEATHER"
    EMERGENCY = "EMERGENCY"


class AlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)
    severity: AlertSeverity
    alert_type: AlertType = AlertType.GENERAL


class AlertResponse(BaseModel):
    id: UUID
    title: str
    message: str
    severity: AlertSeverity
    alert_type: AlertType
    created_at: datetime

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int
    page: int
    page_size: int
