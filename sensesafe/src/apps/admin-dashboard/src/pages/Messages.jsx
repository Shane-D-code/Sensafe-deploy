import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, MessageCircle, AlertTriangle, Flame, Clock,
  CheckCircle, RefreshCw, MapPin, Siren, Filter
} from 'lucide-react';
import { getAllAlertsForAdmin, markMessageAsRead, resolveSOS, resolveIncident, deleteMessage } from '../services/api.js';

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_BORDER = {
  SOS: 'border-l-red-500',
  INCIDENT: 'border-l-orange-500',
  GENERAL: 'border-l-blue-500',
};

function Messages() {
  const [messages, setMessages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, sos: 0, incidents: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllAlertsForAdmin();
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(msgs);
      setStats({
        total: msgs.length,
        unread: msgs.filter(m => !m.is_read).length,
        sos: msgs.filter(m => m.message_type === 'SOS').length,
        incidents: msgs.filter(m => m.message_type === 'INCIDENT').length,
      });
    } catch (e) {
      console.error(e);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 5000); return () => clearInterval(iv); }, [fetchData]);

  useEffect(() => {
    let f = [...messages];
    if (search) f = f.filter(m =>
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.content || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.user_name || '').toLowerCase().includes(search.toLowerCase())
    );
    if (typeFilter !== 'all') f = f.filter(m => m.message_type === typeFilter);
    if (readFilter === 'unread') f = f.filter(m => !m.is_read);
    else if (readFilter === 'read') f = f.filter(m => m.is_read);
    f.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(f);
  }, [messages, search, typeFilter, readFilter]);

  const handleMarkRead = async (msg) => {
    try {
      let updatedMsg = { ...msg, is_read: true };
      if (msg.sourceType === 'MESSAGE') {
        await markMessageAsRead(msg._backendId || msg.id);
      } else if (msg.sourceType === 'SOS') {
        await resolveSOS(msg._backendId || msg.id);
        updatedMsg.status = 'SAFE';
      } else if (msg.sourceType === 'INCIDENT') {
        await resolveIncident(msg._backendId || msg.id);
        updatedMsg.status = 'RESOLVED';
      }
      setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
    } catch (e) {
      console.error('Mark read failed:', e);
      // Optimistic update anyway
      const fallbackStatus = msg.message_type === 'SOS' ? 'SAFE' : 'RESOLVED';
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...msg, is_read: true, status: fallbackStatus } : m));
    }
  };

  const handleResolve = async (msg) => {
    try {
      let updatedMsg = { ...msg, is_read: true };
      let newStatus = 'RESOLVED';
      if (msg.sourceType === 'SOS') {
        await resolveSOS(msg._backendId || msg.id);
        newStatus = 'SAFE';
        updatedMsg.status = 'SAFE';
      } else if (msg.sourceType === 'INCIDENT') {
        await resolveIncident(msg._backendId || msg.id);
        updatedMsg.status = 'RESOLVED';
      } else {
        await markMessageAsRead(msg._backendId || msg.id);
        updatedMsg.status = msg.message_type === 'SOS' ? 'SAFE' : 'RESOLVED';
      }
      setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
    } catch (e) {
      console.error('Resolve failed:', e);
      // Optimistic anyway
      const fallbackStatus = msg.message_type === 'SOS' ? 'SAFE' : 'RESOLVED';
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...msg, is_read: true, status: fallbackStatus } : m));
    }
  };

  const TypeIcon = ({ type }) => {
    if (type === 'SOS') return <Siren className="w-5 h-5 text-red-400" />;
    if (type === 'INCIDENT') return <Flame className="w-5 h-5 text-orange-400" />;
    return <MessageCircle className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-gray-400 text-sm mt-0.5">SOS + incident reports from the Android app</p>
        </div>
        <button onClick={fetchData} disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Unread', value: stats.unread, color: 'text-yellow-400' },
          { label: 'SOS', value: stats.sos, color: 'text-red-400' },
          { label: 'Incidents', value: stats.incidents, color: 'text-orange-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search messages..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="all">All Types</option>
          <option value="SOS">SOS</option>
          <option value="INCIDENT">Incidents</option>
          <option value="GENERAL">General</option>
        </select>
        <select value={readFilter} onChange={e => setReadFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="all">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl text-gray-500">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No messages yet — Android alerts will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => (
            <div key={msg.id}
              className={`bg-gray-900 border border-gray-800 rounded-xl p-5 border-l-4 ${TYPE_BORDER[msg.message_type] || 'border-l-gray-600'} ${!msg.is_read ? 'ring-1 ring-inset ring-gray-700' : 'opacity-80'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <TypeIcon type={msg.message_type} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white text-sm">{msg.title || `${msg.message_type} Alert`}</h3>
                      {!msg.is_read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Unread" />
                      )}
                      {msg.status && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          msg.status === 'SAFE' || msg.status === 'RESOLVED'
                            ? 'bg-green-900/50 text-green-300 border-green-700'
                            : 'bg-red-900/50 text-red-300 border-red-700'
                        }`}>{msg.status}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{msg.content || '(No content)'}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{msg.user_name || 'Unknown user'}</span>
                      {msg.lat && msg.lng && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {Number(msg.lat).toFixed(4)}, {Number(msg.lng).toFixed(4)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(msg.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!msg.is_read && (
                    <button onClick={() => handleMarkRead(msg)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition-colors">
                      Mark read
                    </button>
                  )}
                  {msg.status !== 'SAFE' && msg.status !== 'RESOLVED' && !msg.is_read && (
                    <button onClick={() => handleResolve(msg)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 rounded-lg text-xs transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Messages;
