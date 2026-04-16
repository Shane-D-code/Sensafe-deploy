"""
Disaster Map Service
Main orchestrator for disaster heatmap generation
"""
import logging
from typing import Dict, List
from datetime import datetime

from .news_service import NewsDataService
from .location_mapper import LocationMapper
from .incident_analyzer import IncidentAnalyzer
from .intensity_calculator import IntensityCalculator

logger = logging.getLogger(__name__)


class DisasterMapService:
    """Main service for generating disaster heatmap data"""
    
    def __init__(self, api_key: str = None):
        self.news_service = NewsDataService(api_key) if api_key else NewsDataService()
        self.location_mapper = LocationMapper()
        self.incident_analyzer = IncidentAnalyzer()
        self.intensity_calculator = IntensityCalculator()
    
    def generate_heatmap_data(self) -> Dict:
        """
        Generate complete heatmap data
        
        Returns:
            Dictionary with states, incidents, and metadata
        """
        try:
            logger.info("Starting heatmap data generation")
            
            # Step 1: Fetch news articles
            articles = self.news_service.fetch_disaster_news()
            logger.info(f"Fetched {len(articles)} articles")
            
            if not articles:
                return self._empty_response()
            
            # Step 2: Analyze incidents
            analyzed_incidents = self.incident_analyzer.analyze_multiple_articles(articles)
            logger.info(f"Analyzed {len(analyzed_incidents)} incidents")
            
            # Step 3: Extract locations and map to states
            state_counts = self.location_mapper.get_all_states_with_counts(articles)
            logger.info(f"Mapped incidents to {len([c for c in state_counts.values() if c > 0])} states")
            
            # Step 4: Calculate intensity scores
            intensities = self.intensity_calculator.calculate_intensity(state_counts, analyzed_incidents)
            
            # Step 5: Build response
            states_data = []
            for state, count in state_counts.items():
                intensity = intensities.get(state, 0.0)
                color = self.intensity_calculator.get_color_gradient(intensity)
                trend = self.intensity_calculator.calculate_trend(state)
                
                states_data.append({
                    "name": state,
                    "incident_count": count,
                    "intensity": round(intensity, 3),
                    "color": color,
                    "trend": trend
                })
            
            # Sort by intensity (highest first)
            states_data.sort(key=lambda x: x["intensity"], reverse=True)
            
            # Get incident breakdown by type
            incident_breakdown = self._get_incident_breakdown(analyzed_incidents, articles)
            
            total_incidents = sum(state_counts.values())
            states_affected = len([c for c in state_counts.values() if c > 0])
            
            response = {
                "states": states_data,
                "summary": {
                    "total_incidents": total_incidents,
                    "states_affected": states_affected,
                    "incident_types": incident_breakdown
                },
                "last_updated": datetime.now().isoformat(),
                "data_source": "NewsData.io",
                "cache_duration_seconds": 600
            }
            
            logger.info("Heatmap data generation complete")
            return response
        
        except Exception as e:
            logger.error(f"Error generating heatmap data: {e}", exc_info=True)
            return self._empty_response(error=str(e))
    
    def get_state_details(self, state_name: str) -> Dict:
        """
        Get detailed information for a specific state
        
        Args:
            state_name: Name of the state
        
        Returns:
            Detailed state information
        """
        try:
            # Fetch news articles
            articles = self.news_service.fetch_disaster_news()
            
            # Filter articles for this state
            state_articles = [
                article for article in articles
                if self.location_mapper.extract_state_from_article(article) == state_name
            ]
            
            if not state_articles:
                return {
                    "state": state_name,
                    "incidents": [],
                    "total_incidents": 0,
                    "message": "No incidents found for this state"
                }
            
            # Analyze incidents
            analyzed_incidents = self.incident_analyzer.analyze_multiple_articles(state_articles)
            
            return {
                "state": state_name,
                "incidents": analyzed_incidents,
                "total_incidents": len(analyzed_incidents),
                "last_updated": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error getting state details: {e}", exc_info=True)
            return {
                "state": state_name,
                "error": str(e)
            }
    
    def _get_incident_breakdown(self, analyzed_incidents: List[Dict], articles: List[Dict]) -> Dict:
        """
        Get breakdown of incidents by type
        
        Args:
            analyzed_incidents: List of analyzed incidents
            articles: Original articles
        
        Returns:
            Dictionary with incident type counts
        """
        breakdown = {}
        
        for incident in analyzed_incidents:
            incident_type = incident.get("incident_type", "unknown")
            breakdown[incident_type] = breakdown.get(incident_type, 0) + 1
        
        return breakdown
    
    def _empty_response(self, error: str = None) -> Dict:
        """
        Generate empty response
        
        Args:
            error: Optional error message
        
        Returns:
            Empty response dictionary
        """
        response = {
            "states": [],
            "summary": {
                "total_incidents": 0,
                "states_affected": 0,
                "incident_types": {}
            },
            "last_updated": datetime.now().isoformat(),
            "data_source": "NewsData.io",
            "cache_duration_seconds": 600
        }
        
        if error:
            response["error"] = error
        
        return response
    
    def clear_cache(self):
        """Clear all caches"""
        self.news_service.clear_cache()
        logger.info("All caches cleared")
