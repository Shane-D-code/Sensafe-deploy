import { useState, useEffect, useCallback } from 'react';

export function useRelativeTime(timestamp) {
  const [relativeTime, setRelativeTime] = useState('');

  const calculateTimeAgo = useCallback((ts) => {
    if (!ts) return '—';
    
    const now = Date.now();
    const date = new Date(ts);
    const diff = now - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) return 'just now';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    // Fallback to readable date for older
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  useEffect(() => {
    if (!timestamp) {
      setRelativeTime('—');
      return;
    }

    // Initial calculation
    setRelativeTime(calculateTimeAgo(timestamp));

    // Update every 30 seconds
    const interval = setInterval(() => {
      setRelativeTime(calculateTimeAgo(timestamp));
    }, 30000);

    return () => clearInterval(interval);
  }, [timestamp, calculateTimeAgo]);

  return relativeTime;
}

