from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import optional_user   # <-- NEW
from app.db.models import User
from app.sos.schemas import SOSCreate, SOSResponse, SOSListResponse
from app.sos.service import create_sos_alert, get_user_sos_alerts
from app.core.security import require_user

router = APIRouter(prefix="/api/sos", tags=["SOS"])


@router.post(
    "",
    response_model=SOSResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_sos(
    sos_data: SOSCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(optional_user),
):
    """
    PUBLIC SOS endpoint.

    If a user is logged in → SOS is linked to their account.
    If not logged in → SOS is stored as anonymous (user_id=None).
    """
    return create_sos_alert(db, sos_data, current_user)


@router.get(
    "/user",
    response_model=SOSListResponse,
)
def get_my_sos_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    """
    Get paginated SOS alerts created by the current logged-in user.
    """
    return get_user_sos_alerts(db, current_user, page, page_size)
