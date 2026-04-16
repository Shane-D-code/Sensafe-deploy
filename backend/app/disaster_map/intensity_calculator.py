"""
Disaster Intensity Calculator
Calculates normalized intensity scores for states
"""
import logging
from typing import Dict, List
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)


class IntensityCalculator:
    """Service for calculating disaster intensity scores"""
    
    def __init__(self):
        self.historical_data = defaultdict(list)  # Store historical counts
        self.recent_weight = 0.7  # Weight for recent incidents
        self.historical_weight = 0.3  # Weight for historical average
    
    def calculate_intensity(
        self,
        state_counts: Dict[str, int],
        analyzed_incidents: List[Dict] = None
    ) -> Dict[str, float]:
        """
        Calculate normalized intensity scores for each state
        
        Args:
            state_counts: Dictionary mapping states to incident counts
            analyzed_incidents: List of analyzed incidents (optional)
        
        Returns:
            Dictionary mapping states to intensity scores (0-1)
        """
        if not state_counts:
            return {}
        
        # Get max count for normalization
        max_count = max(state_counts.values()) if state_counts.values() else 1
        
        # Calculate base intensity (normalized 0-1)
        intensities = {}
        for state, count in state_counts.items():
            if max_count > 0:
                base_intensity = count / max_count
            else:
                base_intensity = 0
            
            # Get historical average
            historical_avg = self._get_historical_average(state)
            
            # Calculate weighted intensity
            intensity = (
                base_intensity * self.recent_weight +
                historical_avg * self.historical_weight
            )
            
            # Ensure intensity is between 0 and 1
            intensities[state] = min(max(intensity, 0.0), 1.0)
        
        # Update historical data
        self._update_historical_data(state_counts)
        
        return intensities
    
    def calculate_severity_weighted_intensity(
        self,
        analyzed_incidents: List[Dict],
        state_mapping: Dict[str, str]
    ) -> Dict[str, float]:
        """
        Calculate intensity with severity weighting
        
        Args:
            analyzed_incidents: List of analyzed incidents
            state_mapping: Mapping of article index to state
        
        Returns:
            Dictionary mapping states to weighted intensity scores
        """
        # Severity weights
        severity_weights = {
            "critical": 1.0,
            "high": 0.75,
            "medium": 0.5,
            "low": 0.25
        }
        
        # Calculate weighted counts per state
        state_weighted_counts = defaultdict(float)
        
        for i, incident in enumerate(analyzed_incidents):
            state = state_mapping.get(str(i))
            if state:
                severity = incident.get("severity", "medium")
                weight = severity_weights.get(severity, 0.5)
                state_weighted_counts[state] += weight
        
        # Normalize
        max_weighted = max(state_weighted_counts.values()) if state_weighted_counts.values() else 1
        
        intensities = {}
        for state, weighted_count in state_weighted_counts.items():
            if max_weighted > 0:
                intensities[state] = weighted_count / max_weighted
            else:
                intensities[state] = 0.0
        
        return intensities
    
    def _get_historical_average(self, state: str) -> float:
        """
        Get historical average intensity for a state
        
        Args:
            state: State name
        
        Returns:
            Historical average (0-1)
        """
        if state not in self.historical_data or not self.historical_data[state]:
            return 0.0
        
        # Calculate average of last 10 data points
        recent_history = self.historical_data[state][-10:]
        return sum(recent_history) / len(recent_history)
    
    def _update_historical_data(self, state_counts: Dict[str, int]):
        """
        Update historical data with current counts
        
        Args:
            state_counts: Current state counts
        """
        # Normalize current counts
        max_count = max(state_counts.values()) if state_counts.values() else 1
        
        for state, count in state_counts.items():
            normalized = count / max_count if max_count > 0 else 0
            self.historical_data[state].append(normalized)
            
            # Keep only last 50 data points
            if len(self.historical_data[state]) > 50:
                self.historical_data[state] = self.historical_data[state][-50:]
    
    def get_color_gradient(self, intensity: float) -> str:
        """
        Convert intensity to color hex code
        
        Args:
            intensity: Intensity value (0-1)
        
        Returns:
            Hex color code
        """
        # Color gradient from light orange to dark red
        # Low intensity: #FFA500 (orange)
        # High intensity: #8B0000 (dark red)
        
        if intensity <= 0:
            return "#FFFFFF"  # White for no incidents
        
        # Interpolate between orange and dark red
        # Orange: RGB(255, 165, 0)
        # Dark Red: RGB(139, 0, 0)
        
        r = int(255 - (255 - 139) * intensity)
        g = int(165 * (1 - intensity))
        b = 0
        
        return f"#{r:02x}{g:02x}{b:02x}"
    
    def calculate_trend(self, state: str) -> str:
        """
        Calculate trend for a state (increasing/decreasing/stable)
        
        Args:
            state: State name
        
        Returns:
            Trend string: "increasing", "decreasing", or "stable"
        """
        if state not in self.historical_data or len(self.historical_data[state]) < 3:
            return "stable"
        
        recent = self.historical_data[state][-3:]
        
        # Calculate simple trend
        if recent[-1] > recent[0] * 1.2:
            return "increasing"
        elif recent[-1] < recent[0] * 0.8:
            return "decreasing"
        else:
            return "stable"
