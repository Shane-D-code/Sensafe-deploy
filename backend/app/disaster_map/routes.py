"""
Disaster Map API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from .disaster_map_service import DisasterMapService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/disaster-map", tags=["Disaster Map"])

# Initialize service (singleton)
disaster_map_service = DisasterMapService()


@router.get("/heatmap")
async def get_disaster_heatmap():
    """
    Get disaster heatmap data for India
    
    Returns real-time disaster intensity data for all Indian states
    based on news articles from NewsData.io
    
    Response includes:
    - State-wise incident counts
    - Normalized intensity scores (0-1)
    - Color codes for visualization
    - Incident breakdown by type
    - Trends (increasing/decreasing/stable)
    
    Data is cached for 10 minutes to optimize API usage
    """
    try:
        data = disaster_map_service.generate_heatmap_data()
        return data
    except Exception as e:
        logger.error(f"Error generating heatmap: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate heatmap: {str(e)}")


@router.get("/state/{state_name}")
async def get_state_details(state_name: str):
    """
    Get detailed incident information for a specific state
    
    Args:
        state_name: Name of the Indian state
    
    Returns:
        Detailed list of incidents for the state including:
        - Incident type
        - Severity
        - Timestamp
        - Source URL
        - Description
    """
    try:
        data = disaster_map_service.get_state_details(state_name)
        return data
    except Exception as e:
        logger.error(f"Error getting state details: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get state details: {str(e)}")


@router.post("/clear-cache")
async def clear_cache():
    """
    Clear the news data cache
    
    Forces fresh data fetch on next request
    Useful for testing or when immediate updates are needed
    """
    try:
        disaster_map_service.clear_cache()
        return {"message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.get("/stats")
async def get_disaster_stats():
    """
    Get overall disaster statistics
    
    Returns:
        Summary statistics including:
        - Total incidents across India
        - Most affected states
        - Incident type distribution
        - Severity distribution
    """
    try:
        heatmap_data = disaster_map_service.generate_heatmap_data()
        summary = heatmap_data.get("summary", {})
        
        # Extract top 5 most affected states
        top_states = sorted(
            heatmap_data.get("states", []),
            key=lambda x: x["incident_count"],
            reverse=True
        )[:5]
        
        return {
            "total_incidents": summary.get("total_incidents", 0),
            "states_affected": summary.get("states_affected", 0),
            "top_affected_states": top_states,
            "incident_types": summary.get("incident_types", {}),
            "last_updated": heatmap_data.get("last_updated")
        }
    except Exception as e:
        logger.error(f"Error getting stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
