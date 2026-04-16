import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  MessageCircle, 
  AlertTriangle, 
  Flame, 
  Clock,
  CheckCircle,
  Eye,
  RefreshCw,
  MapPin
} from 'lucide-react';

import VulnerableBadge from '../components/VulnerableBadge';
import StatusBadge from '../components/StatusBadge';

import { 
  getAllAlertsForAdmin, 
  markMessageAsRead,
  resolveSOS,
  resolveIncident
} from '../services/api.js';

function Messages() {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    sos_count: 0,
    incident_count: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // ================= FETCH DATA =================
  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      console.log('🔄 Fetching messages from backend...');

      const data = await getAllAlertsForAdmin();

      // ALWAYS use fallback - handle cases where data might be undefined
      const messagesList = Array.isArray(data?.messages) ? data.messages : [];
      const statsData = data?.stats || {};

      console.log(`📨 Received ${messagesList.length} messages`);

      setMessages(messagesList);

      setStats({
        total: statsData.total || messagesList.length,
        unread: statsData.unread || messagesList.filter(m => !m.is_read).length,
        sos_count: statsData.by_type?.SOS || messagesList.filter(m => m.message_type === 'SOS').length,
        incident_count: statsData.by_type?.INCIDENT || messagesList.filter(m => m.message_type === 'INCIDENT').length
      });

    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      // Set empty data on error to prevent crash
      setMessages([]);
      setStats({ total: 0, unread: 0, sos_count: 0, incident_count: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Real-time polling every 3 seconds
    const interval = setInterval(fetchData, 3000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  // ================= FILTERING =================
  useEffect(() => {
    let filtered = [...messages];

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        (msg.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (msg.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (msg.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(msg => msg.message_type === typeFilter);
    }

    if (readFilter !== 'all') {
      const isRead = readFilter === 'read';
      filtered = filtered.filter(msg => msg.is_read === isRead);
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredMessages(filtered);
  }, [messages, searchTerm, typeFilter, readFilter]);

  // ================= MARK READ =================
  const handleMarkAsRead = async (messageId) => {
    try {
      console.log(`📖 Marking message ${messageId} as read...`);
      await markMessageAsRead(messageId);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        )
      );

      setStats(prev => ({
        ...prev,
        unread: Math.max(prev.unread - 1, 0)
      }));
    } catch (err) {
      console.error('Error marking message as read:', err);
      // Handle 404 gracefully - message might not exist in messages table
      if (err.response?.status === 404) {
        console.warn('Message not found in database - it may be from fallback data');
        // Optimistically mark as read locally
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
        setStats(prev => ({
          ...prev,
          unread: Math.max(prev.unread - 1, 0)
        }));
      }
    }
  };

  // ================= RESOLVE ISSUES =================
  const handleResolve = async (message) => {
    try {
      console.log(`🔧 Resolving ${message.message_type} ${message.id}...`);
      
      if (message.message_type === 'SOS') {
        await resolveSOS(message.id);
      } else if (message.message_type === 'INCIDENT') {
        await resolveIncident(message.id);
      }

      // Update local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === message.id 
            ? { ...msg, is_read: true, status: message.message_type === 'SOS' ? 'SAFE' : 'RESOLVED' }
            : msg
        )
      );

      setStats(prev => ({
        ...prev,
        unread: Math.max(prev.unread - 1, 0)
      }));
    } catch (err) {
      console.error(`Error resolving ${message.message_type}:`, err);
      // Handle gracefully - might be from fallback data
      if (err.response?.status === 404) {
        console.warn(`${message.message_type} not found in database - optimistically updating UI`);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === message.id 
              ? { ...msg, is_read: true, status: message.message_type === 'SOS' ? 'SAFE' : 'RESOLVED' }
              : msg
          )
        );
      }
    }
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'SOS':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'INCIDENT':
        return <Flame className="h-5 w-5 text-orange-500" />;
      default:
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'SOS':
        return 'bg-red-50 border-red-200';
      case 'INCIDENT':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleString();
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-gray-600">
            SOS + Incident reports coming from the Android app
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border rounded-md"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <MessageCircle className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">SOS Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sos_count}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Flame className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Incidents</p>
              <p className="text-2xl font-bold text-gray-900">{stats.incident_count}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="SOS">SOS Only</option>
            <option value="INCIDENT">Incidents Only</option>
            <option value="GENERAL">General</option>
          </select>
          
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread Only</option>
            <option value="read">Read Only</option>
          </select>
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-10 w-10 animate-spin mx-auto text-indigo-500" />
            <p className="mt-2 text-gray-600">Loading messages…</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded shadow">
            <MessageCircle className="h-10 w-10 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">
              No messages yet — Android alerts will appear here.
            </p>
          </div>
        ) : (
          filteredMessages.map(message => (
            <div
              key={message.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${getMessageColor(message.message_type)}`}
            >
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    {getMessageIcon(message.message_type)}
                    <h3 className="font-semibold">{message.title || 'Alert'}</h3>
                    {message.status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        message.status === 'SAFE' || message.status === 'RESOLVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {message.status}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-gray-700">
                    {message.content || '(No content)'}
                  </p>

                  {(message.lat && message.lng) && (
                    <p className="text-sm text-gray-600 mt-2">
                      📍 {message.lat}, {message.lng}
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(message.created_at)}
                  </p>
                </div>

                <div className="flex space-x-2">
                  {!message.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(message.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      title={message._isFallbackData ? 'Cannot mark as read - data from fallback endpoint' : ''}
                      disabled={message._isFallbackData}
                      style={message._isFallbackData ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                      {message._isFallbackData ? 'Read-only' : 'Mark read'}
                    </button>
                  )}
                  
                  {(message.status !== 'SAFE' && message.status !== 'RESOLVED') && (
                    <button
                      onClick={() => handleResolve(message)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      title={`Resolve this ${message.message_type.toLowerCase()}`}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Messages;
