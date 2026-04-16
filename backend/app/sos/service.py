from sqlalchemy.orm import Session

from app.db.models import SOS, User, Message, MessageType
from app.sos.schemas import SOSCreate, SOSResponse, SOSListResponse


def create_sos_alert(db: Session, sos_data: SOSCreate, user: User) -> SOSResponse:
    """Create a new SOS emergency alert for the authenticated user or anonymous user."""

    new_sos = SOS(
        user_id=user.id if user else None,
        ability=sos_data.ability,
        lat=sos_data.lat,
        lng=sos_data.lng,
        battery=sos_data.battery,
        status=sos_data.status,
    )

    db.add(new_sos)
    db.commit()
    db.refresh(new_sos)

    # Create a corresponding Message record for admin dashboard visibility
    try:
        sos_message = Message(
            user_id=user.id if user else None,
            message_type=MessageType.SOS,
            title="🚨 SOS Emergency",
            content=f"SOS sent. Status: {new_sos.status}",
            lat=new_sos.lat,
            lng=new_sos.lng,
            ability=new_sos.ability,
            battery=new_sos.battery,
            is_read=0,
        )
        db.add(sos_message)
        db.commit()
    except Exception as e:
        # Log the error but don't fail the SOS creation
        # The SOS alert is the critical operation
        db.rollback()
        # In production, you would want to log this error
        print(f"Warning: Failed to create SOS message record: {e}")

    return SOSResponse.from_orm(new_sos)


def get_user_sos_alerts(
    db: Session,
    user: User,
    page: int = 1,
    page_size: int = 20,
) -> SOSListResponse:
    """Return paginated SOS alerts that belong to the user."""

    offset = (page - 1) * page_size

    query = db.query(SOS).filter(SOS.user_id == user.id)

    total = query.count()

    sos_alerts = (
        query.order_by(SOS.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return SOSListResponse(
        sos_alerts=[SOSResponse.from_orm(sos) for sos in sos_alerts],
        total=total,
        page=page,
        page_size=page_size,
    )
