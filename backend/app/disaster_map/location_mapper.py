"""
Location Extraction and State Mapping Service
Extracts locations from news articles and maps them to Indian states
"""
import re
import logging
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

logger = logging.getLogger(__name__)

# Indian states and their common variations
INDIAN_STATES = {
    "Andhra Pradesh": ["andhra pradesh", "andhra", "ap"],
    "Arunachal Pradesh": ["arunachal pradesh", "arunachal"],
    "Assam": ["assam"],
    "Bihar": ["bihar"],
    "Chhattisgarh": ["chhattisgarh", "chattisgarh"],
    "Goa": ["goa"],
    "Gujarat": ["gujarat"],
    "Haryana": ["haryana"],
    "Himachal Pradesh": ["himachal pradesh", "himachal", "hp"],
    "Jharkhand": ["jharkhand"],
    "Karnataka": ["karnataka", "bengaluru", "bangalore", "mysore", "mangalore"],
    "Kerala": ["kerala", "kochi", "cochin", "thiruvananthapuram", "trivandrum"],
    "Madhya Pradesh": ["madhya pradesh", "mp", "bhopal", "indore"],
    "Maharashtra": ["maharashtra", "mumbai", "pune", "nagpur", "nashik"],
    "Manipur": ["manipur"],
    "Meghalaya": ["meghalaya", "shillong"],
    "Mizoram": ["mizoram"],
    "Nagaland": ["nagaland"],
    "Odisha": ["odisha", "orissa", "bhubaneswar"],
    "Punjab": ["punjab", "chandigarh", "ludhiana", "amritsar"],
    "Rajasthan": ["rajasthan", "jaipur", "jodhpur", "udaipur"],
    "Sikkim": ["sikkim"],
    "Tamil Nadu": ["tamil nadu", "chennai", "madras", "coimbatore", "madurai"],
    "Telangana": ["telangana", "hyderabad", "warangal"],
    "Tripura": ["tripura"],
    "Uttar Pradesh": ["uttar pradesh", "up", "lucknow", "kanpur", "agra", "varanasi"],
    "Uttarakhand": ["uttarakhand", "dehradun", "haridwar"],
    "West Bengal": ["west bengal", "kolkata", "calcutta", "darjeeling"],
    "Delhi": ["delhi", "new delhi"],
    "Jammu and Kashmir": ["jammu and kashmir", "jammu", "kashmir", "srinagar"],
    "Ladakh": ["ladakh", "leh"]
}

# Major cities to state mapping
CITY_TO_STATE = {
    "mumbai": "Maharashtra",
    "delhi": "Delhi",
    "bangalore": "Karnataka",
    "bengaluru": "Karnataka",
    "hyderabad": "Telangana",
    "chennai": "Tamil Nadu",
    "kolkata": "West Bengal",
    "pune": "Maharashtra",
    "ahmedabad": "Gujarat",
    "surat": "Gujarat",
    "jaipur": "Rajasthan",
    "lucknow": "Uttar Pradesh",
    "kanpur": "Uttar Pradesh",
    "nagpur": "Maharashtra",
    "indore": "Madhya Pradesh",
    "bhopal": "Madhya Pradesh",
    "kochi": "Kerala",
    "cochin": "Kerala",
    "thiruvananthapuram": "Kerala",
    "trivandrum": "Kerala",
    "chandigarh": "Punjab",
    "mysore": "Karnataka",
    "coimbatore": "Tamil Nadu",
    "madurai": "Tamil Nadu",
    "nashik": "Maharashtra",
    "vadodara": "Gujarat",
    "rajkot": "Gujarat",
    "varanasi": "Uttar Pradesh",
    "agra": "Uttar Pradesh",
    "ludhiana": "Punjab",
    "amritsar": "Punjab",
    "bhubaneswar": "Odisha",
    "dehradun": "Uttarakhand",
    "haridwar": "Uttarakhand",
    "shillong": "Meghalaya",
    "srinagar": "Jammu and Kashmir",
    "leh": "Ladakh"
}


class LocationMapper:
    """Service for extracting locations and mapping to Indian states"""
    
    def __init__(self):
        self.states = INDIAN_STATES
        self.city_to_state = CITY_TO_STATE
    
    def extract_state_from_article(self, article: Dict) -> Optional[str]:
        """
        Extract Indian state from news article
        
        Args:
            article: News article dictionary
        
        Returns:
            State name or None if not found
        """
        title = (article.get("title") or "").lower()
        description = (article.get("description") or "").lower()
        content = (article.get("content") or "").lower()
        
        # Combine all text
        full_text = f"{title} {description} {content}"
        
        # First, try to find state names directly
        for state, variations in self.states.items():
            for variation in variations:
                if variation in full_text:
                    return state
        
        # If no state found, try city to state mapping
        for city, state in self.city_to_state.items():
            if city in full_text:
                return state
        
        return None
    
    def extract_location_details(self, article: Dict) -> Dict:
        """
        Extract detailed location information from article
        
        Args:
            article: News article dictionary
        
        Returns:
            Dictionary with location details
        """
        state = self.extract_state_from_article(article)
        
        return {
            "state": state,
            "found": state is not None
        }
    
    def aggregate_state_counts(self, articles: List[Dict]) -> Dict[str, int]:
        """
        Aggregate incident counts by state
        
        Args:
            articles: List of news articles
        
        Returns:
            Dictionary mapping state names to incident counts
        """
        state_counts = defaultdict(int)
        
        for article in articles:
            state = self.extract_state_from_article(article)
            if state:
                state_counts[state] += 1
        
        return dict(state_counts)
    
    def get_all_states_with_counts(self, articles: List[Dict]) -> Dict[str, int]:
        """
        Get all Indian states with their incident counts (0 if no incidents)
        
        Args:
            articles: List of news articles
        
        Returns:
            Dictionary with all states and their counts
        """
        # Start with all states at 0
        all_states = {state: 0 for state in self.states.keys()}
        
        # Update with actual counts
        state_counts = self.aggregate_state_counts(articles)
        all_states.update(state_counts)
        
        return all_states
