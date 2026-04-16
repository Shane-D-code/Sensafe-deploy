# -------------------------------
# DATABASE SETUP
# -------------------------------
from app.db.database import Base, engine, SessionLocal, get_db


# -------------------------------
# MODELS
# -------------------------------
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Float, Integer, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship


# Enums
class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


class UserAbility(str, enum.Enum):
    BLIND = "BLIND"
    LOW_VISION = "LOW_VISION"
    DEAF = "DEAF"
    HARD_OF_HEARING = "HARD_OF_HEARING"
    NON_VERBAL = "NON_VERBAL"
    ELDERLY = "ELDERLY"
    OTHER = "OTHER"
    NONE = "NONE"


class IncidentStatus(str, enum.Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    HELP_ASSIGNED = "HELP_ASSIGNED"
    RESOLVED = "RESOLVED"


class SOSStatus(str, enum.Enum):
    TRAPPED = "TRAPPED"
    INJURED = "INJURED"
    NEED_HELP = "NEED_HELP"
    SAFE = "SAFE"


class AlertSeverity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertType(str, enum.Enum):
    GENERAL = "GENERAL"
    INCIDENT = "INCIDENT"
    WEATHER = "WEATHER"
    EMERGENCY = "EMERGENCY"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    ability = Column(Enum(UserAbility), default=UserAbility.NONE, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    incidents = relationship("Incident", back_populates="user", cascade="all, delete-orphan")
    sos_alerts = relationship("SOS", back_populates="user", cascade="all, delete-orphan")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.PENDING, nullable=False)
    image_url = Column(String(500), nullable=True)
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="incidents")


class SOS(Base):
    __tablename__ = "sos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ability = Column(Enum(UserAbility), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    battery = Column(Integer, nullable=False)
    status = Column(Enum(SOSStatus), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sos_alerts")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    alert_type = Column(Enum(AlertType), default=AlertType.GENERAL, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class MessageType(str, enum.Enum):
    SOS = "SOS"
    INCIDENT = "INCIDENT"
    GENERAL = "GENERAL"


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # Nullable for anonymous SOS
    message_type = Column(Enum(MessageType), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    category = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=True)
    ability = Column(Enum(UserAbility), nullable=True)
    battery = Column(Integer, nullable=True)
    is_read = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="messages")


User.messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")


# -------------------------------
# AUDIT LOGGING
# -------------------------------

class AuditAction(str, enum.Enum):
    """Types of admin actions that can be logged."""
    VIEW_INCIDENTS = "VIEW_INCIDENTS"
    VIEW_ALERTS = "VIEW_ALERTS"
    VERIFY_INCIDENT = "VERIFY_INCIDENT"
    RESOLVE_INCIDENT = "RESOLVE_INCIDENT"
    UPDATE_INCIDENT = "UPDATE_INCIDENT"
    CREATE_ALERT = "CREATE_ALERT"
    DELETE_ALERT = "DELETE_ALERT"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    FAILED_LOGIN = "FAILED_LOGIN"


class AuditLog(Base):
    """
    Audit log for tracking all admin actions.
    
    This provides a complete audit trail of who did what and when.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    admin_email = Column(String(255), nullable=False)
    action = Column(Enum(AuditAction), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(Text, nullable=True)  # JSON string for additional details
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    success = Column(Integer, default=1, nullable=False)  # 1 = success, 0 = failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    admin = relationship("User", backref="audit_logs")


class Scan(Base):
    """
    Scan model for storing ML detection results.
    
    Tracks exit detection scans from the Android app using Roboflow models.
    Stores detected objects (windows, doors, hallways, stairs) with bounding boxes.
    """
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # NULL for anonymous
    image_url = Column(String(500), nullable=True)  # Optional: store image URL
    detections = Column(Text, nullable=False)  # JSON string of detection results
    total_detections = Column(Integer, default=0, nullable=False)
    models_used = Column(String(200), nullable=True)  # Comma-separated: "windows,doors,hallways,stairs"
    scan_duration_ms = Column(Integer, nullable=True)  # Time taken for scan
    avg_confidence = Column(Float, default=0.0, nullable=False)  # Average confidence across all detections
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # NO RELATIONSHIP - prevents lazy loading issues



# -------------------------------
# CREATE TABLES (FIRST RUN ONLY)
# -------------------------------
Base.metadata.create_all(bind=engine)
