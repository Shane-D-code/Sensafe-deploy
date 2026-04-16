from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.db.models import AuditAction, IncidentStatus, SOSStatus, AlertSeverity, AlertType


# Audit Log Schemas (existing)
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


# ML SCAN SCHEMAS - NEW
class ModelPerf(BaseModel):
    """Performance metrics for a specific ML model."""
    count: int  # Number of scans using this model
    total_detections: int
    avg_confidence: float
    high_conf_rate: float  # %% detections > 0.7 confidence


class ModelStats(BaseModel):
    """Stats for all 4 ML models."""
    windows: ModelPerf
    doors: ModelPerf
    hallways: ModelPerf
    stairs: ModelPerf


class ScanStatsResponse(BaseModel):
    """Complete ML scan statistics response."""
    total_scans: int
    total_detections: int
    avg_duration_ms: float
    overall_avg_confidence: float
    models: ModelStats


# Scan List Response (for table)
class ScanDetection(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float
    class_: str  # Avoid 'class' keyword
    class_id: int
    model: str


class ScanResponse(BaseModel):
    id: str
    user_id: Optional[str]
    image_url: Optional[str]
    total_detections: int
    models_used: List[str]
    scan_duration_ms: int
    avg_confidence: float
    created_at: str
    detections: List[ScanDetection] = []


class ScansListResponse(BaseModel):
    scans: List[ScanResponse]
    total: int
    page: int
    page_size: int

