from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
import json
import time

from app.ai.roboflow_detect import detect_all, calculate_image_hash, calculate_severity
from app.db.database import get_db
from app.db.models import Scan
from app.core.security import optional_user
from app.db.models import User
from app.core.ml_config import get_all_model_names

router = APIRouter(prefix="/api/roboflow", tags=["Roboflow ML"])

@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_user)
):
    """
    PUBLIC ENDPOINT - No authentication required.
    
    If user is logged in → scan is linked to their account.
    If not logged in → scan is stored as anonymous (user_id=None).
    """
    """
    Detect exits (windows, doors, hallways, stairs) in an uploaded image.
    
    Uses 4 Roboflow models:
    - Windows detection
    - Doors detection  
    - Hallways detection
    - Stairs detection
    
    Returns combined detections from all models and saves to database.
    
    Enhanced features:
    - Image hash for deduplication
    - Severity calculation (none/low/medium/high)
    - Improved error handling
    - Centralized ML configuration
    """
    start_time = time.time()
    file_path = f"temp_{file.filename}"

    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Calculate image hash for deduplication
        image_hash = calculate_image_hash(file_path)
        
        # Check for duplicate scan (optional - can be disabled)
        # existing_scan = db.query(Scan).filter(Scan.image_hash == image_hash).first()
        # if existing_scan:
        #     return {"message": "Duplicate scan detected", "scan_id": str(existing_scan.id)}

        # Run detection
        results = detect_all(file_path)
        
        # Calculate severity
        severity = calculate_severity(results)
        
        # Calculate duration
        duration_ms = int((time.time() - start_time) * 1000)
        
        # Save scan to database
        try:
        # Calculate avg confidence
            if results:
                confidences = [det.get('confidence', 0) for det in results]
                avg_conf = sum(confidences) / len(confidences)
            else:
                avg_conf = 0.0
            
            scan = Scan(
                user_id=current_user.id if current_user else None,
                detections=json.dumps(results),
                total_detections=len(results),
                models_used=",".join(get_all_model_names()),
                scan_duration_ms=duration_ms,
                avg_confidence=avg_conf
            )

            db.add(scan)
            db.commit()
            db.refresh(scan)
            
            return {
                "success": True,
                "scan_id": str(scan.id),
                "detections": results,
                "total": len(results),
                "severity": severity,
                "duration_ms": duration_ms,
                "models_used": get_all_model_names(),
                "image_hash": image_hash
            }
        except Exception as e:
            db.rollback()
            print(f"Database error: {e}")
            # Return results even if database save fails
            return {
                "success": True,
                "detections": results,
                "total": len(results),
                "severity": severity,
                "duration_ms": duration_ms,
                "models_used": get_all_model_names(),
                "warning": "Scan completed but not saved to database",
                "error": str(e)
            }
    except Exception as e:
        print(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)


@router.get("/scans")
async def get_scans(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(optional_user)
):
    """
    Get scan history for the current user (or all scans if admin).
    """
    offset = (page - 1) * page_size
    
    # If user is logged in, filter by user_id
    if current_user:
        query = db.query(Scan).filter(Scan.user_id == current_user.id)
    else:
        # Anonymous users can't see scan history
        return {"scans": [], "total": 0, "page": page, "page_size": page_size}
    
    total = query.count()
    scans = query.order_by(Scan.created_at.desc()).offset(offset).limit(page_size).all()
    
    # ✅ SAFE: Manual serialization prevents lazy loading
    return {
        "scans": [
            {
                "id": str(scan.id),
                "total_detections": scan.total_detections,
                "models_used": scan.models_used.split(",") if scan.models_used else [],
                "scan_duration_ms": scan.scan_duration_ms,
                "created_at": scan.created_at.isoformat(),
                "detections": json.loads(scan.detections) if scan.detections else []
            }
            for scan in scans
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }