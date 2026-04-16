"""
Admin Audit Service
Provides database operations for audit logging.
"""

import json
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from datetime import datetime, timedelta

from app.db.models import AuditLog, AuditAction, User
from app.core.logger import log_admin_action
from app.core.azure_logging import (
    log_admin_action_azure,
    log_incident_action_azure,
    log_alert_action_azure,
    log_security_event_azure
)


class AuditService:
    """Service for managing audit logs."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_action(
        self,
        admin_user: User,
        action: AuditAction,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        details: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> AuditLog:
        """
        Log an admin action to the database.
        
        Args:
            admin_user: The admin user performing the action
            action: The type of action being performed
            resource_type: Type of resource being affected
            resource_id: ID of the affected resource
            details: Additional details about the action
            ip_address: Client IP address
            user_agent: Client user agent
            success: Whether the action was successful
            error_message: Error message if action failed
        
        Returns:
            AuditLog: The created audit log entry
        """
        # Create audit log entry
        audit_entry = AuditLog(
            admin_id=admin_user.id,
            admin_email=admin_user.email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            user_agent=user_agent,
            success=1 if success else 0,
            error_message=error_message
        )
        
        self.db.add(audit_entry)
        self.db.flush()  # Flush instead of commit - let the endpoint commit
        self.db.refresh(audit_entry)
        
        # Also log to application logger
        log_admin_action(
            admin_id=str(admin_user.id),
            admin_email=admin_user.email,
            action=action.value,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            details=details,
            success=success,
            error_message=error_message
        )
        
        # Also log to Azure (if configured)
        try:
            log_admin_action_azure(
                admin_id=str(admin_user.id),
                admin_email=admin_user.email,
                action=action.value,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                success=success,
                error_message=error_message
            )
        except Exception:
            pass  # Azure logging is optional
        
        return audit_entry
    
    def get_audit_logs(
        self,
        admin_id: Optional[UUID] = None,
        action: Optional[AuditAction] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 50
    ) -> List[AuditLog]:
        """
        Get audit logs with filtering and pagination.
        
        Args:
            admin_id: Filter by admin user ID
            action: Filter by action type
            resource_type: Filter by resource type
            resource_id: Filter by specific resource ID
            start_date: Filter by start date
            end_date: Filter by end date
            page: Page number (1-indexed)
            page_size: Items per page
        
        Returns:
            List[AuditLog]: List of audit log entries
        """
        query = self.db.query(AuditLog)
        
        if admin_id:
            query = query.filter(AuditLog.admin_id == admin_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.filter(AuditLog.resource_id == resource_id)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        offset = (page - 1) * page_size
        
        return query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size).all()
    
    def get_audit_log_by_id(self, log_id: UUID) -> Optional[AuditLog]:
        """Get a single audit log by ID."""
        return self.db.query(AuditLog).filter(AuditLog.id == log_id).first()
    
    def get_audit_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """
        Get audit log statistics.
        
        Args:
            start_date: Start date for statistics
            end_date: End date for statistics
        
        Returns:
            dict: Statistics about audit logs
        """
        query = self.db.query(AuditLog)
        
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        total = query.count()
        successful = query.filter(AuditLog.success == 1).count()
        failed = query.filter(AuditLog.success == 0).count()
        
        # Count by action type
        action_counts = {}
        for action in AuditAction:
            count = query.filter(AuditLog.action == action).count()
            if count > 0:
                action_counts[action.value] = count
        
        # Count by admin
        admin_counts = {}
        for admin_id, email in self.db.query(
            AuditLog.admin_id, 
            AuditLog.admin_email
        ).filter(
            AuditLog.created_at >= (start_date or datetime.min)
        ).filter(
            AuditLog.created_at <= (end_date or datetime.utcnow())
        ).distinct().all():
            count = query.filter(AuditLog.admin_id == admin_id).count()
            admin_counts[email] = count
        
        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "by_action": action_counts,
            "by_admin": admin_counts
        }
    
    def get_recent_activity(
        self,
        admin_id: Optional[UUID] = None,
        limit: int = 10
    ) -> List[AuditLog]:
        """
        Get recent activity for display.
        
        Args:
            admin_id: Filter by specific admin
            limit: Number of entries to return
        
        Returns:
            List[AuditLog]: Recent audit log entries
        """
        query = self.db.query(AuditLog)
        
        if admin_id:
            query = query.filter(AuditLog.admin_id == admin_id)
        
        return query.order_by(desc(AuditLog.created_at)).limit(limit).all()


def log_incident_action(
    db: Session,
    admin_user: User,
    action: AuditAction,
    incident_id: UUID,
    previous_status: Optional[str] = None,
    new_status: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> AuditLog:
    """
    Convenience function to log incident-related actions.
    
    Args:
        db: Database session
        admin_user: The admin user performing the action
        action: The action being performed
        incident_id: The incident ID
        previous_status: Previous status (for updates)
        new_status: New status (for updates)
        details: Additional details
        ip_address: Client IP address
        user_agent: Client user agent
        success: Whether the action was successful
        error_message: Error message if action failed
    
    Returns:
        AuditLog: The created audit log entry
    """
    audit_details = details or {}
    if previous_status:
        audit_details["previous_status"] = previous_status
    if new_status:
        audit_details["new_status"] = new_status
    
    service = AuditService(db)
    
    # Also log to Azure
    try:
        log_incident_action_azure(
            action=action.value,
            incident_id=str(incident_id),
            admin_id=str(admin_user.id),
            admin_email=admin_user.email,
            details=audit_details
        )
    except Exception:
        pass
    
    return service.log_action(
        admin_user=admin_user,
        action=action,
        resource_type="INCIDENT",
        resource_id=incident_id,
        details=audit_details,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        error_message=error_message
    )


def log_alert_action(
    db: Session,
    admin_user: User,
    action: AuditAction,
    alert_id: UUID,
    severity: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> AuditLog:
    """
    Convenience function to log alert-related actions.
    
    Args:
        db: Database session
        admin_user: The admin user performing the action
        action: The action being performed
        alert_id: The alert ID
        severity: Alert severity
        details: Additional details
        ip_address: Client IP address
        user_agent: Client user agent
        success: Whether the action was successful
        error_message: Error message if action failed
    
    Returns:
        AuditLog: The created audit log entry
    """
    audit_details = details or {}
    if severity:
        audit_details["severity"] = severity
    
    service = AuditService(db)
    
    # Also log to Azure
    try:
        log_alert_action_azure(
            action=action.value,
            alert_id=str(alert_id),
            admin_id=str(admin_user.id),
            admin_email=admin_user.email,
            severity=severity,
            details=audit_details
        )
    except Exception:
        pass
    
    return service.log_action(
        admin_user=admin_user,
        action=action,
        resource_type="ALERT",
        resource_id=alert_id,
        details=audit_details,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        error_message=error_message
    )


def log_auth_action(
    db: Session,
    admin_user: Optional[User],
    action: AuditAction,
    email: str,
    success: bool = True,
    error_message: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Optional[AuditLog]:
    """
    Convenience function to log authentication actions.
    
    Args:
        db: Database session
        admin_user: The admin user (None if login failed)
        action: LOGIN, LOGOUT, or FAILED_LOGIN
        email: The email used for login
        success: Whether the action was successful
        error_message: Error message if action failed
        ip_address: Client IP address
        user_agent: Client user agent
    
    Returns:
        AuditLog: The created audit log entry (or None if no user)
    """
    if not admin_user:
        # Log failed login without user reference
        admin_id = None
        admin_email = email
    else:
        admin_id = admin_user.id
        admin_email = admin_user.email
    
    # Also log to Azure
    try:
        log_security_event_azure(
            event_type=action.value,
            user_id=str(admin_id) if admin_id else None,
            details={"email": email, "success": success},
            success=success
        )
    except Exception:
        pass
    
    if not admin_user:
        # Can't create audit log without a user reference
        return None
    
    service = AuditService(db)
    return service.log_action(
        admin_user=admin_user,
        action=action,
        resource_type="AUTH",
        resource_id=None,
        details={"email": email},
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        error_message=error_message
    )

