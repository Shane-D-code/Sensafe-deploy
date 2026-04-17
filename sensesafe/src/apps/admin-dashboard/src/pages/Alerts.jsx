import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Siren, RefreshCw, Search, Filter,
  MapPin, Battery, Clock, CheckCircle, Eye, Flame
} from 'lucide-react';
import { getAllAlertsForAdmin, resolveSOS, resolveIncident, markMessageAsRead, deleteMessage } from '../services/api.js';



const TYPE_COLORS = {
  SOS: 'bg-red-900/50 text-red-300 border border-red-700',
  INCIDENT: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  GENERAL: 'bg-blue-900/50 text-blue-300 border border-blue-700',
};

const STATUS_COLORS = {
  Active: 'bg-red-900/50 text-red-300 border border-red-700',
  Resolved: 'bg-green-900/50 text-green-300 border border-green-700',
  NEED_HELP: 'bg-red-900/50 text-red-300 border border-red-700',
  TRAPPED: 'bg-red-900/50 text-red-300 border border-red-700',
  INJURED: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  SAFE: 'bg-green-900/50 text-green-300 border border-green-700',
  RESOLVED: 'bg-green-900/50 text-green-300 border border-green-700',
};

function getRelativeTime(timestamp) {
  if (!timestamp) return '—';
  const now = Date.now();
  const date = new Date(timestamp);
  const diff = now - date.getTime();
  if (diff < 60000) return 'just now';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Alerts() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [stats, setStats] = useState({ total: 0, sos: 0, incidents: 0, unread: 0 });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllAlertsForAdmin();
      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      setItems(msgs);
      setStats({
        total: msgs.length,
        sos: msgs.filter(m => m.message_type === 'SOS').length,
        incidents: msgs.filter(m => m.message_type === 'INCIDENT').length,
        unread: msgs.filter(m => !m.is_read).length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    let f = [...items];
    if (search) f = f.filter(m =>
      (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.content || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.user_name || '').toLowerCase().includes(search.toLowerCase())
    );
    if (typeFilter !== 'all') f = f.filter(m => m.message_type === typeFilter);
    if (statusFilter === 'active') f = f.filter(m => !m.is_read);
    else if (statusFilter === 'resolved') f = f.filter(m => m.is_read);
    f.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFiltered(f);
  }, [items, search, typeFilter, statusFilter]);

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
      setItems(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));
    } catch (e) {
      console.error('Resolve failed:', e);
      // Optimistic update  
      setItems(prev => prev.map(m => m.id === msg.id ? { ...msg, is_read: true, status: 'RESOLVED' } : m));
    }
  };

  const TypeIcon = ({ type }) => {
    if (type === 'SOS') return <Siren className="w-4 h-4 text-red-400" />;
    if (type === 'INCIDENT') return <Flame className="w-4 h-4 text-orange-400" />;
    return <AlertTriangle className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-gray-400 text-sm mt-0.5">All SOS and incident alerts from the app</p>
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
          { label: 'SOS', value: stats.sos, color: 'text-red-400' },
          { label: 'Incidents', value: stats.incidents, color: 'text-orange-400' },
          { label: 'Unresolved', value: stats.unread, color: 'text-yellow-400' },
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
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="all">All Types</option>
          <option value="SOS">SOS Only</option>
          <option value="INCIDENT">Incidents Only</option>
          <option value="GENERAL">General</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="resolved">Resolved Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No alerts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Title / Content</th>
                  <th className="px-5 py-3 text-left font-medium">User</th>
                  <th className="px-5 py-3 text-left font-medium">Location</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Time</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(msg => (
                  <tr key={msg.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <TypeIcon type={msg.message_type} />
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[msg.message_type] || 'bg-gray-800 text-gray-400'}`}>
                          {msg.message_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <p className="text-gray-200 font-medium truncate">{msg.title || '—'}</p>
                      <p className="text-gray-500 text-xs truncate">{msg.content || ''}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{msg.user_name || 'Unknown'}</td>
                    <td className="px-5 py-3">
                      {msg.lat && msg.lng ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {Number(msg.lat).toFixed(3)}, {Number(msg.lng).toFixed(3)}
                        </span>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        msg.is_read ? STATUS_COLORS.RESOLVED : STATUS_COLORS.Active
                      }`}>
                        {msg.status || (msg.is_read ? 'Resolved' : 'Active')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {getRelativeTime(msg.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/alerts/${msg.id}`} key={msg.id}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {!msg.is_read && (
                          <button onClick={() => handleResolve(msg)}
                            className="p-1.5 bg-green-900/50 hover:bg-green-800 rounded-lg text-green-400 hover:text-green-300 transition-colors border border-green-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Alerts;
