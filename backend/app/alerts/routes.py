from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.db.models import Alert
from app.alerts.schemas import (
    AlertResponse,
    AlertListResponse,
    AlertType,
)


router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
def get_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * page_size

    query = db.query(Alert)

    total = query.count()

    alerts = (
        query.order_by(Alert.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return AlertListResponse(
        alerts=[AlertResponse.from_orm(alert) for alert in alerts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/{alert_id}/resolve")
def resolve_alert(alert_id: UUID, db: Session = Depends(get_db)):
    """
    Resolve an alert by deleting it.
    Only INCIDENT alerts can be resolved.
    """

    alert = db.query(Alert).filter(Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found",
        )

    # normalize attribute (DB may store as message_type or alert_type)
    alert_type = getattr(alert, "alert_type", None) or getattr(
        alert, "message_type", None
    )

    if alert_type != AlertType.INCIDENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only incident alerts can be resolved.",
        )

    db.delete(alert)
    db.commit()

    return {"message": "Alert resolved successfully"}
