from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_user
from app.db.models import User
from app.auth.schemas import UserRegister, UserLogin, AuthResponse, UserResponse
from app.auth.service import register_user, login_user, get_current_user_info, logout_user


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - **name**: User's full name
    - **email**: Valid email address
    - **password**: Minimum 6 characters
    - **role**: USER or ADMIN (default: USER)
    - **ability**: Accessibility requirement (default: NONE)
    
    Returns JWT token and user information.
    """
    return register_user(db, user_data)


@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Login with email and password.
    
    - **email**: Registered email address
    - **password**: User's password
    
    Returns JWT token and user information.
    """
    client_host = request.client.host if request.client else None
    return login_user(db, credentials, ip_address=client_host)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    
    Requires valid JWT token in Authorization header.
    """
    return get_current_user_info(current_user)


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(current_user: User = Depends(get_current_user)):
    """
    Refresh JWT token for current user.
    
    Requires valid JWT token in Authorization header.
    Returns new JWT token with extended expiration.
    """
    from app.core.security import create_access_token
    
    # Generate new token
    access_token = create_access_token(data={"sub": str(current_user.id)})
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.from_orm(current_user)
    )


@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logout current user.
    
    Logs the logout event for audit purposes.
    Note: JWT tokens are stateless, so this doesn't invalidate the token.
    """
    client_host = request.client.host if request.client else None
    return logout_user(db, current_user, ip_address=client_host)

