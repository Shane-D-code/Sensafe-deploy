from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token
from app.auth.schemas import UserRegister, UserLogin, AuthResponse, UserResponse
from app.admin.service import log_auth_action
from app.admin.schemas_fixed import AuditAction


def register_user(db: Session, user_data: UserRegister) -> AuthResponse:
    """Register a new user and return auth token."""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        ability=user_data.ability
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    # Log registration
    try:
        log_auth_action(
            db=db,
            admin_user=new_user,
            action=AuditAction.LOGIN,
            email=user_data.email,
            success=True,
            details={"role": user_data.role.value if hasattr(user_data.role, 'value') else str(user_data.role)}
        )
    except Exception:
        pass  # Audit logging is optional
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.from_orm(new_user)
    )


def login_user(db: Session, credentials: UserLogin, ip_address: str = None) -> AuthResponse:
    """Authenticate user and return auth token."""
    
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        # Log failed login attempt
        try:
            log_auth_action(
                db=db,
                admin_user=None,
                action=AuditAction.FAILED_LOGIN,
                email=credentials.email,
                success=False,
                error_message="User not found",
                ip_address=ip_address
            )
        except Exception:
            pass  # Audit logging is optional
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        # Log failed login attempt
        try:
            log_auth_action(
                db=db,
                admin_user=user,
                action=AuditAction.FAILED_LOGIN,
                email=credentials.email,
                success=False,
                error_message="Invalid password",
                ip_address=ip_address
            )
        except Exception:
            pass  # Audit logging is optional
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Log successful login
    try:
        log_auth_action(
            db=db,
            admin_user=user,
            action=AuditAction.LOGIN,
            email=credentials.email,
            success=True,
            ip_address=ip_address,
            details={"role": user.role.value if hasattr(user.role, 'value') else str(user.role)}
        )
    except Exception:
        pass  # Audit logging is optional
    
    return AuthResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


def get_current_user_info(user: User) -> UserResponse:
    """Get current user information."""
    return UserResponse.from_orm(user)


def logout_user(db: Session, user: User, ip_address: str = None) -> dict:
    """
    Logout user (for audit logging purposes).
    
    Note: JWT tokens are stateless, so we can't invalidate them on the server.
    This function logs the logout event for audit purposes.
    """
    try:
        log_auth_action(
            db=db,
            admin_user=user,
            action=AuditAction.LOGOUT,
            email=user.email,
            success=True,
            ip_address=ip_address
        )
    except Exception:
        pass  # Audit logging is optional
    
    return {"message": "Logged out successfully"}

