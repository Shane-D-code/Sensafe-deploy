from datetime import datetime
from typing import Optional, List
import json

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from app.db.database import get_db
from app.core.security import require_admin

from app.db.models import User, Incident, Alert, SOS, Scan, IncidentStatus, AlertSeverity, AlertType, SOSStatus
from app.incidents.schemas import IncidentResponse, IncidentListResponse, IncidentUpdate
from app.alerts.schemas import AlertResponse, AlertCreate
from app.sos.schemas import SOSResponse, SOSListResponse
from app.admin.schemas_fixed import AuditLogResponse, AuditLogListResponse, AuditLogStatsResponse, SOSStatsResponse
from app.admin.schemas import ModelPerf, ModelStats, ScanStatsResponse
from app.admin.service import AuditService, log_incident_action, log_alert_action
from app.admin.schemas_fixed import AuditAction
from app.auth.schemas import UserListResponse, UserResponse


# Response models for scan endpoints
class ModelPerf(BaseModel):
    count: int
    total_detections: int
    avg_confidence: float
    high_conf_rate: float

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


router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=UserListResponse)
def get_all_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get all users (admin only).
    
    Supports pagination and search:
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **search**: Search by name or email (optional)
    
    Admin access required.
    """
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Build query
    query = db.query(User)
    
    # Apply search filter if provided
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_filter)) | 
            (User.email.ilike(search_filter))
        )
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Log admin action
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS, # Using generic view action until we have VIEW_USERS
        resource_type="USER",
        details={
            "page": page,
            "page_size": page_size,
            "search": search,
            "total_users": total,
            "returned_count": len(users)
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return UserListResponse(
        users=[UserResponse.from_orm(user) for user in users],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/incidents", response_model=IncidentListResponse)
def get_all_incidents(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get all incidents (admin only).
    
    Supports filtering and pagination:
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status_filter**: Filter by status (optional)
    
    Admin access required.
    """
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Build query
    query = db.query(Incident)
    
    # Apply status filter if provided
    if status_filter:
        try:
            status_enum = IncidentStatus[status_filter]
            query = query.filter(Incident.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    total = query.count()
    incidents = query.order_by(Incident.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Log admin action - viewing incidents list
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,
        resource_type="INCIDENT",
        details={
            "page": page,
            "page_size": page_size,
            "status_filter": status_filter,
            "total_incidents": total,
            "returned_count": len(incidents)
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return IncidentListResponse(
        incidents=[IncidentResponse.from_orm(inc) for inc in incidents],
        total=total,
        page=page,
        page_size=page_size
    )


@router.patch("/incidents/{incident_id}/verify", response_model=IncidentResponse)
def verify_incident(
    incident_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Verify an incident (admin only).
    
    Changes incident status to VERIFIED.
    Admin access required.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    previous_status = incident.status.value if incident.status else None
    incident.status = IncidentStatus.VERIFIED
    db.commit()
    db.refresh(incident)
    
    # Log admin action - verify incident
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    log_incident_action(
        db=db,
        admin_user=admin_user,
        action=AuditAction.VERIFY_INCIDENT,
        incident_id=incident_id,
        previous_status=previous_status,
        new_status="VERIFIED",
        details={
            "incident_type": incident.type,
            "incident_description": incident.description[:100] if incident.description else None
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return IncidentResponse.from_orm(incident)


@router.patch("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
def resolve_incident(
    incident_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Resolve an incident (admin only).
    
    Changes incident status to RESOLVED.
    Admin access required.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    previous_status = incident.status.value if incident.status else None
    incident.status = IncidentStatus.RESOLVED
    db.commit()
    db.refresh(incident)
    
    # Log admin action - resolve incident
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    log_incident_action(
        db=db,
        admin_user=admin_user,
        action=AuditAction.RESOLVE_INCIDENT,
        incident_id=incident_id,
        previous_status=previous_status,
        new_status="RESOLVED",
        details={
            "incident_type": incident.type,
            "incident_description": incident.description[:100] if incident.description else None,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return IncidentResponse.from_orm(incident)


@router.patch("/incidents/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: UUID,
    update_data: IncidentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Update incident details (admin only).
    
    Allows updating status, risk_score, and risk_level.
    Admin access required.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    previous_status = incident.status.value if incident.status else None
    previous_risk_score = incident.risk_score
    previous_risk_level = incident.risk_level
    
    # Update fields if provided
    if update_data.status:
        incident.status = IncidentStatus[update_data.status]
    if update_data.risk_score is not None:
        incident.risk_score = update_data.risk_score
    if update_data.risk_level:
        incident.risk_level = update_data.risk_level
    
    db.commit()
    db.refresh(incident)
    
    # Log admin action - update incident
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    log_incident_action(
        db=db,
        admin_user=admin_user,
        action=AuditAction.UPDATE_INCIDENT,
        incident_id=incident_id,
        previous_status=previous_status,
        new_status=update_data.status,
        details={
            "updated_fields": {
                "status": update_data.status,
                "risk_score": update_data.risk_score,
                "risk_level": update_data.risk_level
            },
            "previous_values": {
                "status": previous_status,
                "risk_score": previous_risk_score,
                "risk_level": previous_risk_level
            }
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return IncidentResponse.from_orm(incident)


@router.post("/alerts", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_data: AlertCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Create a new disaster alert (admin only).
    
    - **title**: Alert title
    - **message**: Alert message
    - **severity**: LOW, MEDIUM, HIGH, or CRITICAL
    
    Admin access required.
    """
    new_alert = Alert(
        title=alert_data.title,
        message=alert_data.message,
        severity=AlertSeverity[alert_data.severity],
        alert_type=alert_data.alert_type
    )
    
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    
    # Log admin action - create alert
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    log_alert_action(
        db=db,
        admin_user=admin_user,
        action=AuditAction.CREATE_ALERT,
        alert_id=new_alert.id,
        severity=alert_data.severity,
        details={
            "title": alert_data.title,
            "severity": alert_data.severity,
            "message_length": len(alert_data.message)
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return AlertResponse.from_orm(new_alert)


# ==================== AUDIT LOG ENDPOINTS ====================

@router.get("/audit-logs", response_model=AuditLogListResponse)
def get_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: str = Query(None),
    resource_type: str = Query(None),
    admin_id: UUID = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get audit logs (admin only).
    
    Supports filtering and pagination:
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 50, max: 100)
    - **action**: Filter by action type (optional)
    - **resource_type**: Filter by resource type (optional)
    - **admin_id**: Filter by admin user ID (optional)
    
    Admin access required.
    """
    # Parse action enum if provided
    action_enum = None
    if action:
        try:
            action_enum = AuditAction[action]
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action type: {action}"
            )
    
    service = AuditService(db)
    audit_logs = service.get_audit_logs(
        admin_id=admin_id,
        action=action_enum,
        resource_type=resource_type,
        page=page,
        page_size=page_size
    )
    
    total = len(service.get_audit_logs(
        admin_id=admin_id,
        action=action_enum,
        resource_type=resource_type,
        page=1,
        page_size=10000  # Get total count
    ))
    
    # Log this access
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    service.log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,  # Using VIEW_INCIDENTS as proxy
        resource_type="AUDIT_LOG",
        details={
            "page": page,
            "page_size": page_size,
            "filters": {
                "action": action,
                "resource_type": resource_type,
                "admin_id": str(admin_id) if admin_id else None
            }
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return AuditLogListResponse(
        audit_logs=[AuditLogResponse.from_orm(log) for log in audit_logs],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/audit-logs/stats", response_model=AuditLogStatsResponse)
def get_audit_stats(
    request: Request,
    days: int = Query(7, ge=1, le=365),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get audit log statistics (admin only).
    
    Returns statistics about admin actions for the specified number of days.
    
    - **days**: Number of days to analyze (default: 7, max: 365)
    
    Admin access required.
    """
    from datetime import datetime, timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    end_date = datetime.utcnow()
    
    service = AuditService(db)
    stats = service.get_audit_stats(start_date=start_date, end_date=end_date)
    
    # Log this access
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    service.log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,  # Using VIEW_INCIDENTS as proxy
        resource_type="AUDIT_LOG",
        details={
            "action": "VIEW_STATS",
            "days_analyzed": days
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return AuditLogStatsResponse(**stats)


# ==================== SOS ADMIN ENDPOINTS ====================

@router.get("/sos", response_model=SOSListResponse)
def get_all_sos_alerts(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get all SOS alerts (admin only).
    
    Supports filtering and pagination:
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    - **status_filter**: Filter by status (optional)
    
    Admin access required.
    """
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Build query
    query = db.query(SOS)
    
    # Apply status filter if provided
    if status_filter:
        try:
            status_enum = SOSStatus[status_filter]
            query = query.filter(SOS.status == status_enum)
        except KeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}"
            )
    
    total = query.count()
    sos_alerts = query.order_by(SOS.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Log admin action
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,
        resource_type="SOS",
        details={
            "page": page,
            "page_size": page_size,
            "status_filter": status_filter,
            "total_sos": total,
            "returned_count": len(sos_alerts)
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return SOSListResponse(
        sos_alerts=[SOSResponse.from_orm(sos) for sos in sos_alerts],
        total=total,
        page=page,
        page_size=page_size
    )


@router.patch("/sos/{sos_id}/resolve", response_model=SOSResponse)
def resolve_sos(
    sos_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Resolve an SOS alert (admin only).
    
    Changes SOS status to SAFE.
    Admin access required.
    """
    sos_alert = db.query(SOS).filter(SOS.id == sos_id).first()
    
    if not sos_alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SOS alert not found"
        )
    
    previous_status = sos_alert.status.value if sos_alert.status else None
    sos_alert.status = SOSStatus.SAFE
    db.commit()
    db.refresh(sos_alert)
    
    # Log admin action
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.RESOLVE_INCIDENT,
        resource_type="SOS",
        resource_id=str(sos_id),
        details={
            "previous_status": previous_status,
            "new_status": "SAFE",
            "ability": sos_alert.ability,
            "battery": sos_alert.battery
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )
    
    return SOSResponse.from_orm(sos_alert)


# ==================== STATS ENDPOINTS ====================

@router.get("/stats/sos", response_model=SOSStatsResponse)
def get_sos_stats(
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get active SOS count (admin only).

    Returns count of SOS alerts where status is NOT SAFE.

    Active SOS statuses: TRAPPED, INJURED, NEED_HELP

    Admin access required.
    """
    # Count SOS alerts where status is not SAFE
    active_count = db.query(SOS).filter(SOS.status != SOSStatus.SAFE).count()

    # Log admin action
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)

    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,
        resource_type="SOS_STATS",
        details={"active_sos": active_count},
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )

    return SOSStatsResponse(active_sos=active_count)


# ==================== MAP DATA ENDPOINT ====================

class MapMarkerResponse(BaseModel):
    """Schema for map marker response."""
    id: UUID
    type: str  # "incident" or "sos"
    lat: float
    lng: float
    status: str
    title: str
    severity: Optional[str] = None
    ability: Optional[str] = None
    battery: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MapDataResponse(BaseModel):
    """Schema for combined map data response."""
    incidents: List[MapMarkerResponse]
    sos_alerts: List[MapMarkerResponse]


@router.get("/map-data", response_model=MapDataResponse)
def get_map_data(
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get all incidents and SOS alerts for map visualization (admin only).

    Returns:
    - incidents: List of incident markers (status != RESOLVED)
    - sos_alerts: List of SOS markers (status != SAFE)

    Admin access required.
    """
    # Get active incidents (not resolved)
    active_incidents = db.query(Incident).filter(
        Incident.status != IncidentStatus.RESOLVED
    ).all()

    # Get active SOS alerts (not SAFE)
    active_sos = db.query(SOS).filter(
        SOS.status != SOSStatus.SAFE
    ).all()

    # Format incidents
    incident_markers = [
        MapMarkerResponse(
            id=inc.id,
            type="incident",
            lat=inc.lat,
            lng=inc.lng,
            status=inc.status.value if inc.status else "UNKNOWN",
            title=f"Incident: {inc.type}",
            severity=inc.risk_level,
            ability=None,
            battery=None,
            created_at=inc.created_at
        )
        for inc in active_incidents
    ]

    # Format SOS
    sos_markers = [
        MapMarkerResponse(
            id=sos.id,
            type="sos",
            lat=sos.lat,
            lng=sos.lng,
            status=sos.status.value if sos.status else "NEED_HELP",
            title=f"SOS — Status: {sos.status.value if sos.status else 'NEED_HELP'}",
            severity="critical",
            ability=sos.ability.value if sos.ability else None,
            battery=sos.battery,
            created_at=sos.created_at
        )
        for sos in active_sos
    ]

    # Log admin action
    client_host = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)

    AuditService(db).log_action(
        admin_user=admin_user,
        action=AuditAction.VIEW_INCIDENTS,
        resource_type="MAP_DATA",
        details={
            "incident_count": len(incident_markers),
            "sos_count": len(sos_markers)
        },
        ip_address=client_host,
        user_agent=user_agent,
        success=True
    )

    return MapDataResponse(
        incidents=incident_markers,
        sos_alerts=sos_markers
    )



# ==================== SCAN/ML DETECTION ENDPOINTS ====================

@router.get("/scans")
def get_all_scans(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get all ML detection scans (admin only).
    
    Returns scan history from Roboflow exit detection.
    """
    try:
        offset = (page - 1) * page_size
        
        # Query scans with proper ordering
        query = db.query(Scan).order_by(Scan.created_at.desc())
        total = query.count()
        scans = query.offset(offset).limit(page_size).all()
        
        # ✅ SAFE: Manual serialization prevents lazy loading
        return {
            "scans": [
                {
                    "id": str(scan.id),
                    "user_id": str(scan.user_id) if scan.user_id else None,
                    "total_detections": scan.total_detections,
                    "models_used": scan.models_used.split(",") if scan.models_used else [],
                    "scan_duration_ms": scan.scan_duration_ms,
                    "created_at": scan.created_at.isoformat() if scan.created_at else None,
                    "detections": json.loads(scan.detections) if scan.detections else []
                }
                for scan in scans
            ],
            "total": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        print(f"Error fetching scans: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch scans: {str(e)}")


@router.get("/scans/stats", response_model=ScanStatsResponse)
def get_scan_stats(
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get ML detection scan statistics (admin only).
    
    Returns aggregated statistics about ML scans including:
    - Total number of scans
    - Total detections across all scans
    - Average scan duration
    - Breakdown by model type (windows, doors, hallways, stairs)
    """
    try:
        # Basic aggregates
        total_scans = db.query(func.count(Scan.id)).scalar() or 0
        total_detections = db.query(func.sum(Scan.total_detections)).scalar() or 0
        avg_duration = db.query(func.avg(Scan.scan_duration_ms)).scalar()
        avg_duration_ms = float(avg_duration) if avg_duration else 0.0
        
        # Overall avg confidence
        overall_avg_conf = db.query(func.avg(Scan.avg_confidence)).scalar() or 0.0
        
        # Model-specific stats
        model_stats = {
            "windows": {"count": 0, "detections": 0, "total_conf": 0.0, "high_conf": 0},
            "doors": {"count": 0, "detections": 0, "total_conf": 0.0, "high_conf": 0},
            "hallways": {"count": 0, "detections": 0, "total_conf": 0.0, "high_conf": 0},
            "stairs": {"count": 0, "detections": 0, "total_conf": 0.0, "high_conf": 0}
        }
        
        # Process each scan
        scans = db.query(Scan).filter(Scan.models_used.isnot(None)).all()
        for scan in scans:
            models = [m.strip().lower() for m in scan.models_used.split(',')]
            for model in models:
                if model in model_stats:
                    model_stats[model]["count"] += 1
                    model_stats[model]["detections"] += scan.total_detections
                    model_stats[model]["total_conf"] += scan.avg_confidence * scan.total_detections or 0
                    model_stats[model]["high_conf"] += sum(1 for d in json.loads(scan.detections or "[]") if d.get("confidence", 0) > 0.7)
        
        # Compute ModelPerf for each
        models_perf = {}
        for model_name, stats in model_stats.items():
            count = stats["count"]
            if count > 0:
                avg_conf = stats["total_conf"] / stats["detections"] if stats["detections"] > 0 else 0.0
                high_rate = (stats["high_conf"] / stats["detections"] * 100) if stats["detections"] > 0 else 0.0
            else:
                avg_conf = 0.0
                high_rate = 0.0
                
            models_perf[model_name] = ModelPerf(
                count=count,
                total_detections=stats["detections"],
                avg_confidence=avg_conf,
                high_conf_rate=high_rate
            )
        
        return ScanStatsResponse(
            total_scans=int(total_scans),
            total_detections=int(total_detections),
            avg_duration_ms=avg_duration_ms,
            overall_avg_confidence=float(overall_avg_conf),
            models=ModelStats(**models_perf)
        )
        
    except Exception as e:
        print(f"❌ Error in get_scan_stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return ScanStatsResponse(
            total_scans=0, total_detections=0, avg_duration_ms=0.0, 
            overall_avg_confidence=0.0,
            models=ModelStats(
                windows=ModelPerf(count=0, total_detections=0, avg_confidence=0.0, high_conf_rate=0.0),
                doors=ModelPerf(count=0, total_detections=0, avg_confidence=0.0, high_conf_rate=0.0),
                hallways=ModelPerf(count=0, total_detections=0, avg_confidence=0.0, high_conf_rate=0.0),
                stairs=ModelPerf(count=0, total_detections=0, avg_confidence=0.0, high_conf_rate=0.0)
            )
        )


@router.get("/analytics/alerts-over-time")
def get_alerts_over_time(
    request: Request,
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Get alerts over time for analytics chart (admin only).
    
    Returns time-series data for:
    - SOS alerts
    - Incidents
    - System alerts
    
    Grouped by day for the specified number of days.
    
    Args:
        days: Number of days to include (default: 7, max: 30)
    
    Returns:
        {
            "labels": ["2026-04-10", "2026-04-11", ...],
            "sos": [5, 3, 8, ...],
            "incidents": [2, 4, 1, ...],
            "alerts": [1, 0, 2, ...]
        }
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, cast, Date
    
    try:
        # Calculate date range
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days - 1)
        
        # Generate all dates in range
        date_range = []
        current_date = start_date
        while current_date <= end_date:
            date_range.append(current_date)
            current_date += timedelta(days=1)
        
        # Query SOS alerts by date
        sos_by_date = db.query(
            cast(SOS.created_at, Date).label('date'),
            func.count(SOS.id).label('count')
        ).filter(
            cast(SOS.created_at, Date) >= start_date
        ).group_by(
            cast(SOS.created_at, Date)
        ).all()
        
        # Query Incidents by date
        incidents_by_date = db.query(
            cast(Incident.created_at, Date).label('date'),
            func.count(Incident.id).label('count')
        ).filter(
            cast(Incident.created_at, Date) >= start_date
        ).group_by(
            cast(Incident.created_at, Date)
        ).all()
        
        # Query System Alerts by date
        alerts_by_date = db.query(
            cast(Alert.created_at, Date).label('date'),
            func.count(Alert.id).label('count')
        ).filter(
            cast(Alert.created_at, Date) >= start_date
        ).group_by(
            cast(Alert.created_at, Date)
        ).all()
        
        # Convert to dictionaries for easy lookup
        sos_dict = {str(row.date): row.count for row in sos_by_date}
        incidents_dict = {str(row.date): row.count for row in incidents_by_date}
        alerts_dict = {str(row.date): row.count for row in alerts_by_date}
        
        # Build response arrays
        labels = []
        sos_data = []
        incidents_data = []
        alerts_data = []
        
        for date in date_range:
            date_str = str(date)
            labels.append(date_str)
            sos_data.append(sos_dict.get(date_str, 0))
            incidents_data.append(incidents_dict.get(date_str, 0))
            alerts_data.append(alerts_dict.get(date_str, 0))
        
        # Log admin action
        client_host = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", None)
        
        AuditService(db).log_action(
            admin_user=admin_user,
            action=AuditAction.VIEW_INCIDENTS,  # Generic view action
            resource_type="ANALYTICS",
            details={
                "endpoint": "alerts-over-time",
                "days": days,
                "total_sos": sum(sos_data),
                "total_incidents": sum(incidents_data),
                "total_alerts": sum(alerts_data)
            },
            ip_address=client_host,
            user_agent=user_agent
        )
        
        return {
            "labels": labels,
            "sos": sos_data,
            "incidents": incidents_data,
            "alerts": alerts_data,
            "total_sos": sum(sos_data),
            "total_incidents": sum(incidents_data),
            "total_alerts": sum(alerts_data)
        }
        
    except Exception as e:
        print(f"❌ Error in get_alerts_over_time: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch alerts over time: {str(e)}"
        )
