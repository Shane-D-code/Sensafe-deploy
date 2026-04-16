from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime

from app.db.models import AuditAction


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    id: UUID
    admin_id: UUID
    admin_email: str
    action: AuditAction
    resource_type: str
    resource_id: Optional[UUID] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: int
    error_message: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log list."""
    audit_logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int


class AuditLogStatsResponse(BaseModel):
    """Schema for audit log statistics."""
    total: int
    successful: int
    failed: int
    by_action: dict
    by_admin: dict


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs."""
    admin_id: Optional[UUID] = None
    action: Optional[AuditAction] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    page_size: int = 50


class ActivityPoint(BaseModel):
    date: str
    count: int
    type: str

class ActivityStatsResponse(BaseModel):
    data: List[ActivityPoint]


class SOSStatsResponse(BaseModel):
    """Schema for SOS statistics response."""
    active_sos: int


# ML Scan Performance Schemas
class ModelPerf(BaseModel):
    count: int  # scans using this model
    total_detections: int
    avg_confidence: float
    high_conf_rate: float  # %% detections >0.7 conf

class ModelStats(BaseModel):
    windows: ModelPerf
    doors: ModelPerf
    hallways: ModelPerf
    stairs: ModelPerf

class ScanStatsResponse(BaseModel):
    total_scans: int
    total_detections: int
    avg_duration_ms: float
    overall_avg_confidence: float
    models: ModelStats

