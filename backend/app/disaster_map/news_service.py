"""
NewsData.io Integration Service
Fetches India-related disaster news
"""
import requests
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from functools import lru_cache
import hashlib

logger = logging.getLogger(__name__)

# NewsData.io API Configuration
NEWSDATA_API_KEY = "pub_b915104d5dc64a0ebf82fed2c4362bb1"
NEWSDATA_BASE_URL = "https://newsdata.io/api/1/news"

# Disaster keywords
DISASTER_KEYWORDS = [
    "fire", "flood", "accident", "collapse", "explosion",
    "cyclone", "earthquake", "landslide", "tsunami", "drought"
]

# Irrelevant contexts to filter out
IRRELEVANT_CONTEXTS = [
    "market crash", "fired employee", "stock market", "cryptocurrency",
    "political fire", "under fire", "cease fire", "open fire",
    "fire sale", "rapid fire", "friendly fire"
]


class NewsDataService:
    """Service for fetching disaster news from NewsData.io"""
    
    def __init__(self, api_key: str = NEWSDATA_API_KEY):
        self.api_key = api_key
        self.base_url = NEWSDATA_BASE_URL
        self._cache = {}
        self._cache_duration = 600  # 10 minutes
    
    def fetch_disaster_news(
        self,
        keywords: List[str] = None,
        country: str = "in",  # India
        language: str = "en",
        max_results: int = 50
    ) -> List[Dict]:
        """
        Fetch disaster-related news from NewsData.io
        
        Args:
            keywords: List of disaster keywords
            country: Country code (default: 'in' for India)
            language: Language code (default: 'en')
            max_results: Maximum number of results
        
        Returns:
            List of news articles
        """
        if keywords is None:
            keywords = DISASTER_KEYWORDS
        
        # Check cache
        cache_key = self._get_cache_key(keywords, country)
        if cache_key in self._cache:
            cached_data, cached_time = self._cache[cache_key]
            if datetime.now() - cached_time < timedelta(seconds=self._cache_duration):
                logger.info(f"Returning cached news data (age: {(datetime.now() - cached_time).seconds}s)")
                return cached_data
        
        try:
            # Fetch news for each keyword separately and combine
            # This approach works better with NewsData.io API
            all_articles = []
            results_per_keyword = max(5, max_results // len(keywords))
            
            for keyword in keywords[:3]:  # Limit to top 3 keywords to avoid rate limits
                params = {
                    "apikey": self.api_key,
                    "q": keyword,
                    "country": country,
                    "language": language,
                    "size": results_per_keyword
                }
                
                logger.info(f"Fetching news for keyword: {keyword}")
                response = requests.get(self.base_url, params=params, timeout=10)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == "success":
                    articles = data.get("results", [])
                    all_articles.extend(articles)
                    logger.info(f"Fetched {len(articles)} articles for '{keyword}'")
            
            logger.info(f"Total articles fetched: {len(all_articles)}")
            
            # Filter relevant articles
            filtered_articles = self._filter_relevant_articles(all_articles)
            logger.info(f"Filtered to {len(filtered_articles)} relevant articles")
            
            # Deduplicate
            unique_articles = self._deduplicate_articles(filtered_articles)
            logger.info(f"Deduplicated to {len(unique_articles)} unique articles")
            
            # Cache results
            self._cache[cache_key] = (unique_articles, datetime.now())
            
            return unique_articles
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch news: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching news: {e}")
            return []
    
    def _filter_relevant_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Filter out irrelevant articles based on context
        
        Args:
            articles: List of news articles
        
        Returns:
            Filtered list of relevant disaster articles
        """
        relevant = []
        
        for article in articles:
            title = (article.get("title") or "").lower()
            description = (article.get("description") or "").lower()
            content = f"{title} {description}"
            
            # Check if article contains irrelevant context
            is_irrelevant = any(
                context in content
                for context in IRRELEVANT_CONTEXTS
            )
            
            if not is_irrelevant:
                # Check if article contains disaster keywords
                has_disaster_keyword = any(
                    keyword in content
                    for keyword in DISASTER_KEYWORDS
                )
                
                if has_disaster_keyword:
                    relevant.append(article)
        
        return relevant
    
    def _deduplicate_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Remove duplicate articles based on title similarity
        
        Args:
            articles: List of news articles
        
        Returns:
            Deduplicated list of articles
        """
        seen_hashes = set()
        unique_articles = []
        
        for article in articles:
            title = article.get("title") or ""
            # Create hash of title (case-insensitive)
            title_hash = hashlib.md5(title.lower().encode()).hexdigest()
            
            if title_hash not in seen_hashes:
                seen_hashes.add(title_hash)
                unique_articles.append(article)
        
        return unique_articles
    
    def _get_cache_key(self, keywords: List[str], country: str) -> str:
        """Generate cache key from parameters"""
        key_str = f"{','.join(sorted(keywords))}_{country}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def clear_cache(self):
        """Clear the news cache"""
        self._cache.clear()
        logger.info("News cache cleared")
