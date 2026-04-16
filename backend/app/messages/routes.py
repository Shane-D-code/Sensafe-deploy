from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.core.security import require_user, require_admin
from app.db.models import User, Message
from app.messages.schemas import (
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    MessageCreateResponse,
    SOSMessageCreate,
    IncidentMessageCreate
)
from app.messages.service import (
    create_message,
    create_sos_message,
    create_incident_message,
    get_user_messages,
    get_all_messages,
    mark_message_read,
    get_message_stats
)

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    return create_message(db, message_data, current_user)


@router.post("/sos", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_sos_alert(
    sos_data: SOSMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    return create_sos_message(db, sos_data, current_user)


@router.post("/incident", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def report_incident_message(
    incident_data: IncidentMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    return create_incident_message(db, incident_data, current_user)


@router.get("", response_model=MessageListResponse)
def get_my_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    return get_user_messages(db, current_user, page, page_size)


@router.get("/{message_id}", response_model=MessageResponse)
def get_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.user_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    return MessageResponse.from_orm(message)


@router.post("/{message_id}/read", response_model=MessageResponse)
def mark_as_read(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user)
):
    return mark_message_read(db, message_id, current_user, is_admin=False)


# ---------------- ADMIN -----------------


@router.get("/admin/all", response_model=MessageListResponse)
def get_all_messages_admin(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    message_type: str = Query(None),
    is_read: str = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return get_all_messages(db, page, page_size, message_type, is_read)


@router.get("/admin/stats")
def get_message_stats_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return get_message_stats(db)


@router.post("/admin/{message_id}/read", response_model=MessageResponse)
def admin_mark_read(
    message_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    return mark_message_read(db, message_id, admin_user, is_admin=True)


@router.get("/admin/unread/count")
def get_unread_count_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    count = db.query(Message).filter(Message.is_read == 0).count()
    return {"unread_count": count}


@router.delete("/admin/{message_id}")
def admin_delete_message(
    message_id: UUID,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """
    Completely delete SOS/Incident/General message
    """

    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )

    db.delete(message)
    db.commit()

    return {"message": "Deleted successfully"}
