"""
Azure Application Insights Integration
Provides cloud logging for the SenseSafe application.
"""

from typing import Optional, Dict, Any
from datetime import datetime
import logging
from app.core.config import settings

logger = logging.getLogger(__name__.split('.')[0])

# Track if Azure is configured
_azure_configured = False
_telemetry_client = None


def is_azure_configured() -> bool:
    """Check if Azure Application Insights is configured."""
    return (
        settings.AZURE_CV_KEY is not None and 
        settings.AZURE_CV_KEY != "" and
        settings.AZURE_CV_ENDPOINT is not None and
        settings.AZURE_CV_ENDPOINT != ""
    )


def init_azure_logging() -> bool:
    """
    Initialize Azure Application Insights client.
    
    Returns:
        bool: True if successfully initialized, False otherwise
    """
    global _azure_configured, _telemetry_client
    
    if not is_azure_configured():
        logger.info("Azure Application Insights not configured - using local logging only")
        _azure_configured = False
        return False
    
    try:
        # Try to import Azure SDK
        try:
            from azure.monitor.telemetry import TelemetryClient
        except ImportError:
            # Azure SDK not installed
            logger.warning("Azure SDK not installed. Install with: pip install azure-monitor-telemetry")
            _azure_configured = False
            return False
        
        _telemetry_client = TelemetryClient(
            instrumentation_key=settings.AZURE_CV_KEY,
            endpoint_suffix="in.monitor.azure.com"
        )
        _azure_configured = True
        logger.info("Azure Application Insights initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Azure Application Insights: {e}")
        _azure_configured = False
        return False


def log_to_azure(
    name: str,
    properties: Optional[Dict[str, Any]] = None,
    metrics: Optional[Dict[str, float]] = None
) -> bool:
    """
    Log an event to Azure Application Insights.
    
    Args:
        name: Event name
        properties: Custom properties to log
        metrics: Custom metrics to log
    
    Returns:
        bool: True if logged successfully, False otherwise
    """
    if not _azure_configured:
        return False
    
    if _telemetry_client is None:
        return False
    
    try:
        _telemetry_client.track_event(
            name=name,
            properties=properties,
            metrics=metrics
        )
        _telemetry_client.flush()
        return True
    except Exception as e:
        logger.error(f"Failed to log to Azure: {e}")
        return False


def log_admin_action_azure(
    admin_id: str,
    admin_email: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> None:
    """
    Log an admin action to Azure Application Insights.
    
    Args:
        admin_id: Admin user ID
        admin_email: Admin email
        action: Action type (e.g., RESOLVE_INCIDENT)
        resource_type: Type of resource (e.g., INCIDENT, ALERT)
        resource_id: ID of the affected resource
        success: Whether the action was successful
        error_message: Error message if action failed
    """
    properties = {
        "admin_id": admin_id,
        "admin_email": admin_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id or "",
        "success": str(success),
        "error_message": error_message or "",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_to_azure(
        name=f"AdminAction_{action}",
        properties=properties
    )


def log_security_event_azure(
    event_type: str,
    user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    success: bool = True
) -> None:
    """
    Log a security event to Azure Application Insights.
    
    Args:
        event_type: Type of security event (LOGIN, LOGOUT, FAILED_LOGIN, etc.)
        user_id: User ID if applicable
        details: Additional details
        success: Whether the event was successful
    """
    properties = {
        "event_type": event_type,
        "user_id": user_id or "",
        "success": str(success),
        "details": str(details) if details else "",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_to_azure(
        name=f"SecurityEvent_{event_type}",
        properties=properties
    )


def log_incident_action_azure(
    action: str,
    incident_id: str,
    admin_id: str,
    admin_email: str,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log an incident-related action to Azure Application Insights.
    
    Args:
        action: Action type (CREATE, VERIFY, RESOLVE, UPDATE)
        incident_id: Incident ID
        admin_id: Admin user ID
        admin_email: Admin email
        details: Additional details
    """
    properties = {
        "action": action,
        "incident_id": incident_id,
        "admin_id": admin_id,
        "admin_email": admin_email,
        "details": str(details) if details else "",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_to_azure(
        name=f"IncidentAction_{action}",
        properties=properties
    )


def log_alert_action_azure(
    action: str,
    alert_id: str,
    admin_id: str,
    admin_email: str,
    severity: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log an alert-related action to Azure Application Insights.
    
    Args:
        action: Action type (CREATE)
        alert_id: Alert ID
        admin_id: Admin user ID
        admin_email: Admin email
        severity: Alert severity
        details: Additional details
    """
    properties = {
        "action": action,
        "alert_id": alert_id,
        "admin_id": admin_id,
        "admin_email": admin_email,
        "severity": severity or "",
        "details": str(details) if details else "",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    log_to_azure(
        name=f"AlertAction_{action}",
        properties=properties
    )


# Initialize on module import
init_azure_logging()

