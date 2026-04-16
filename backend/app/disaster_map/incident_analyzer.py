"""
Incident Analysis Service
Extracts structured data from news articles
"""
import re
import logging
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class IncidentType(str, Enum):
    """Types of disaster incidents"""
    FIRE = "fire"
    FLOOD = "flood"
    ACCIDENT = "accident"
    COLLAPSE = "collapse"
    EXPLOSION = "explosion"
    CYCLONE = "cyclone"
    EARTHQUAKE = "earthquake"
    LANDSLIDE = "landslide"
    TSUNAMI = "tsunami"
    DROUGHT = "drought"
    UNKNOWN = "unknown"


class SeverityLevel(str, Enum):
    """Severity levels for incidents"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Keywords for incident type detection
INCIDENT_TYPE_KEYWORDS = {
    IncidentType.FIRE: ["fire", "blaze", "burning", "burnt", "inferno"],
    IncidentType.FLOOD: ["flood", "flooding", "inundation", "waterlogging", "deluge"],
    IncidentType.ACCIDENT: ["accident", "crash", "collision", "mishap"],
    IncidentType.COLLAPSE: ["collapse", "collapsed", "building collapse", "structure collapse"],
    IncidentType.EXPLOSION: ["explosion", "blast", "explode", "detonation"],
    IncidentType.CYCLONE: ["cyclone", "storm", "hurricane", "typhoon"],
    IncidentType.EARTHQUAKE: ["earthquake", "quake", "tremor", "seismic"],
    IncidentType.LANDSLIDE: ["landslide", "mudslide", "rockslide"],
    IncidentType.TSUNAMI: ["tsunami", "tidal wave"],
    IncidentType.DROUGHT: ["drought", "water scarcity", "dry spell"]
}

# Keywords for severity detection
SEVERITY_KEYWORDS = {
    SeverityLevel.CRITICAL: [
        "massive", "major", "catastrophic", "devastating", "severe",
        "hundreds killed", "many dead", "death toll", "casualties"
    ],
    SeverityLevel.HIGH: [
        "serious", "significant", "large", "multiple casualties",
        "dozens injured", "extensive damage"
    ],
    SeverityLevel.MEDIUM: [
        "moderate", "several injured", "some damage", "minor casualties"
    ],
    SeverityLevel.LOW: [
        "minor", "small", "limited", "no casualties", "no injuries"
    ]
}


class IncidentAnalyzer:
    """Service for analyzing incidents from news articles"""
    
    def __init__(self):
        self.incident_keywords = INCIDENT_TYPE_KEYWORDS
        self.severity_keywords = SEVERITY_KEYWORDS
    
    def analyze_article(self, article: Dict) -> Dict:
        """
        Analyze article and extract structured incident data
        
        Args:
            article: News article dictionary
        
        Returns:
            Structured incident data
        """
        title = article.get("title", "")
        description = article.get("description", "")
        content = article.get("content", "")
        pub_date = article.get("pubDate", "")
        
        # Combine text for analysis
        full_text = f"{title} {description} {content}".lower()
        
        # Extract incident type
        incident_type = self._detect_incident_type(full_text)
        
        # Detect severity
        severity = self._detect_severity(full_text)
        
        # Parse timestamp
        timestamp = self._parse_timestamp(pub_date)
        
        return {
            "title": title,
            "description": description,
            "incident_type": incident_type.value,
            "severity": severity.value,
            "timestamp": timestamp,
            "source_url": article.get("link", ""),
            "image_url": article.get("image_url", ""),
            "raw_date": pub_date
        }
    
    def _detect_incident_type(self, text: str) -> IncidentType:
        """
        Detect incident type from text
        
        Args:
            text: Article text (lowercase)
        
        Returns:
            IncidentType enum
        """
        # Count matches for each incident type
        type_scores = {}
        
        for incident_type, keywords in self.incident_keywords.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score > 0:
                type_scores[incident_type] = score
        
        # Return type with highest score
        if type_scores:
            return max(type_scores, key=type_scores.get)
        
        return IncidentType.UNKNOWN
    
    def _detect_severity(self, text: str) -> SeverityLevel:
        """
        Detect severity level from text
        
        Args:
            text: Article text (lowercase)
        
        Returns:
            SeverityLevel enum
        """
        # Check for severity keywords in order of priority
        for severity, keywords in self.severity_keywords.items():
            if any(keyword in text for keyword in keywords):
                return severity
        
        # Default to medium if no keywords found
        return SeverityLevel.MEDIUM
    
    def _parse_timestamp(self, date_str: str) -> Optional[str]:
        """
        Parse timestamp from various date formats
        
        Args:
            date_str: Date string from article
        
        Returns:
            ISO format timestamp or None
        """
        if not date_str:
            return None
        
        try:
            # Try parsing ISO format
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.isoformat()
        except:
            try:
                # Try parsing common formats
                for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y"]:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        return dt.isoformat()
                    except:
                        continue
            except:
                pass
        
        return date_str  # Return original if parsing fails
    
    def analyze_multiple_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Analyze multiple articles
        
        Args:
            articles: List of news articles
        
        Returns:
            List of analyzed incidents
        """
        return [self.analyze_article(article) for article in articles]
