"""
Application Logger Configuration
Provides structured logging for the SenseSafe application.
"""

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
import json
from datetime import datetime

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured log output."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data)


def setup_logger(
    name: str = "sensesafe",
    level: int = logging.INFO,
    log_file: Optional[str] = None,
    json_format: bool = False
) -> logging.Logger:
    """
    Setup and configure a logger.
    
    Args:
        name: Logger name
        level: Logging level (default: INFO)
        log_file: Optional filename to log to file
        json_format: Whether to use JSON formatting
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    
    if json_format:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter(
                '[%(asctime)s] %(levelname)s - %(name)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
        )
    
    logger.addHandler(console_handler)
    
    # Add file handler if log file specified
    if log_file:
        log_path = LOGS_DIR / log_file
        file_handler = logging.FileHandler(log_path)
        
        if json_format:
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(
                logging.Formatter(
                    '[%(asctime)s] %(levelname)s - %(name)s - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S'
                )
            )
        
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the standard SenseSafe configuration.
    
    Args:
        name: Logger name (usually __name__)
    
    Returns:
        Logger instance
    """
    return setup_logger(name=f"sensesafe.{name}")


# Audit-specific logger
audit_logger = setup_logger(
    name="sensesafe.audit",
    level=logging.INFO,
    log_file="audit.log",
    json_format=True
)

# Admin action logger
admin_logger = setup_logger(
    name="sensesafe.admin",
    level=logging.INFO,
    log_file="admin_actions.log",
    json_format=True
)

# Security logger
security_logger = setup_logger(
    name="sensesafe.security",
    level=logging.DEBUG,
    log_file="security.log",
    json_format=True
)


def log_admin_action(
    admin_id: str,
    admin_email: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> None:
    """
    Log an admin action with full context.
    
    Args:
        admin_id: Admin user ID
        admin_email: Admin email
        action: Action type (e.g., RESOLVE_INCIDENT)
        resource_type: Type of resource (e.g., INCIDENT, ALERT)
        resource_id: ID of the affected resource
        details: Additional details about the action
        success: Whether the action was successful
        error_message: Error message if action failed
    """
    log_data = {
        "admin_id": admin_id,
        "admin_email": admin_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
        "success": success,
        "error_message": error_message
    }
    
    if success:
        admin_logger.info(
            f"Admin action: {action} on {resource_type}",
            extra={"extra_data": log_data}
        )
    else:
        admin_logger.error(
            f"Admin action failed: {action} on {resource_type} - {error_message}",
            extra={"extra_data": log_data}
        )

