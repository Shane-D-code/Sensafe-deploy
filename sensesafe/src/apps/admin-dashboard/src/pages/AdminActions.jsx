import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, RefreshCw, MessageCircle, Flame, Siren,
  Bell, Send, X
} from 'lucide-react';
import { getAllAlertsForAdmin, resolveSOS, resolveIncident, markMessageAsRead, createDisasterAlert } from '../services/api.js';

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

function AdminActions() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, unread: 0, sos: 0, incidents: 0 });
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', severity: 'MEDIUM' });
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await getAllAlertsForAdmin();
      const list = Array.isArray(data?.messages) ? data.messages : [];
      setAlerts(list);
      setStats({
        total: list.length,
        unread: list.filter(a => !a.is_read).length,
        sos: list.filter(a => a.message_type === 'SOS').length,
        incidents: list.filter(a => a.message_type === 'INCIDENT').length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleResolve = async (alert) => {
    try {
      let newStatus = 'RESOLVED';
      if (alert.message_type === 'SOS') {
        await resolveSOS(alert.id);
        newStatus = 'SAFE';
      } else if (alert.message_type === 'INCIDENT') {
        await resolveIncident(alert.id);
      } else {
        // GENERAL message
        await markMessageAsRead(alert.id);
      }
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true, status: newStatus } : a));
      setStats(prev => ({ ...prev, unread: Math.max(prev.unread - 1, 0) }));
    } catch (e) { 
      console.error('Resolve failed:', e); 
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markMessageAsRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      setStats(prev => ({ ...prev, unread: Math.max(prev.unread - 1, 0) }));
    } catch (e) { console.error(e); }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    setBroadcastResult(null);
    try {
      await createDisasterAlert(broadcastForm);
      setBroadcastResult({ success: true, msg: 'Alert broadcast successfully!' });
      setBroadcastForm({ title: '', message: '', severity: 'medium' });
    } catch (err) {
      setBroadcastResult({ success: false, msg: err.response?.data?.detail || 'Failed to broadcast alert.' });
    } finally {
      setBroadcasting(false);
    }
  };

  const TypeIcon = ({ type }) => {
    if (type === 'SOS') return <Siren className="w-4 h-4 text-red-400" />;
    if (type === 'INCIDENT') return <Flame className="w-4 h-4 text-orange-400" />;
    return <MessageCircle className="w-4 h-4 text-blue-400" />;
  };

  const activeAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Actions</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage alerts and broadcast emergency notifications</p>
        </div>
        <button onClick={fetchAlerts} disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Alerts', value: stats.total, color: 'text-white' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Alerts */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Active Alerts</h2>
            <p className="text-xs text-gray-500 mt-0.5">{activeAlerts.length} requiring action</p>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600 opacity-50" />
              <p className="text-sm">All alerts resolved</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
              {activeAlerts.slice(0, 15).map(alert => (
                <div key={alert.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <TypeIcon type={alert.message_type} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{alert.title || `${alert.message_type} Alert`}</p>
                        <p className="text-xs text-gray-500 truncate">{alert.content || '—'}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{alert.user_name || 'Unknown'} · {timeAgo(alert.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleMarkRead(alert.id)}
                        className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 rounded text-xs transition-colors">
                        Read
                      </button>
                      {alert.status !== 'SAFE' && alert.status !== 'RESOLVED' && (
                        <button onClick={() => handleResolve(alert)}
                          className="px-2 py-1 bg-green-900/50 hover:bg-green-800 border border-green-700 text-green-300 rounded text-xs transition-colors">
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Broadcast Alert */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
            <Bell className="w-4 h-4 text-yellow-400" /> Broadcast Disaster Alert
          </h2>
          <p className="text-xs text-gray-500 mb-4">Send an emergency notification to all app users</p>

          <form onSubmit={handleBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Title</label>
              <input
                type="text"
                required
                value={broadcastForm.title}
                onChange={e => setBroadcastForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Flood Warning"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Message</label>
              <textarea
                required
                rows={3}
                value={broadcastForm.message}
                onChange={e => setBroadcastForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Describe the emergency situation..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <select
                value={broadcastForm.severity}
                onChange={e => setBroadcastForm(p => ({ ...p, severity: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {broadcastResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                broadcastResult.success ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'
              }`}>
                {broadcastResult.success ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {broadcastResult.msg}
              </div>
            )}

            <button type="submit" disabled={broadcasting}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors">
              <Send className="w-4 h-4" />
              {broadcasting ? 'Broadcasting...' : 'Broadcast Alert'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminActions;
