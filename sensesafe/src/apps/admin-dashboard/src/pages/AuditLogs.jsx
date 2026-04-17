import React, { useState, useEffect } from 'react';
import {
  Search, Filter, User, Activity, AlertTriangle, CheckCircle,
  XCircle, Clock, RefreshCw
} from 'lucide-react';
import { getAuditLogs, getAuditStats } from '../services/api.js';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', resourceType: '', page: 1, pageSize: 50 });
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, page_size: filters.pageSize };
      if (filters.action) params.action = filters.action;
      if (filters.resourceType) params.resource_type = filters.resourceType;
      const data = await getAuditLogs(params);
      setLogs(data.audit_logs || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try { setStats(await getAuditStats(7)); } catch {}
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    const iv = setInterval(() => { fetchStats(); if (filters.page === 1) fetchLogs(); }, 15000);
    return () => clearInterval(iv);
  }, [filters]);

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v, page: ['action', 'resourceType'].includes(k) ? 1 : p.page }));

  const actionIcon = (action) => {
    if (action.includes('LOGIN')) return <User className="w-3.5 h-3.5 text-blue-400" />;
    if (action.includes('VERIFY') || action.includes('RESOLVE')) return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    if (action.includes('CREATE')) return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
    if (action.includes('FAILED')) return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  };

  const formatAction = (a) => a.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track all admin actions and system events</p>
        </div>
        <button onClick={() => { fetchLogs(); fetchStats(); }} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total (7d)', value: stats.total, color: 'text-white' },
            { label: 'Successful', value: stats.successful, color: 'text-green-400' },
            { label: 'Failed', value: stats.failed, color: 'text-red-400' },
            { label: 'Success Rate', value: stats.total > 0 ? `${Math.round((stats.successful / stats.total) * 100)}%` : '—', color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <select value={filters.action} onChange={e => setFilter('action', e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Actions</option>
          <option value="VIEW_INCIDENTS">View Incidents</option>
          <option value="VERIFY_INCIDENT">Verify Incident</option>
          <option value="RESOLVE_INCIDENT">Resolve Incident</option>
          <option value="CREATE_ALERT">Create Alert</option>
          <option value="LOGIN">Login</option>
          <option value="FAILED_LOGIN">Failed Login</option>
        </select>
        <select value={filters.resourceType} onChange={e => setFilter('resourceType', e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Resources</option>
          <option value="INCIDENT">Incident</option>
          <option value="ALERT">Alert</option>
          <option value="AUTH">Authentication</option>
        </select>
        <span className="ml-auto text-xs text-gray-500 self-center">
          {logs.length} of {total} entries
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                  <th className="px-5 py-3 text-left font-medium">Action</th>
                  <th className="px-5 py-3 text-left font-medium">Admin</th>
                  <th className="px-5 py-3 text-left font-medium">Resource</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {actionIcon(log.action)}
                        <span className="text-gray-200">{formatAction(log.action)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-300">{log.admin_email}</p>
                      <p className="text-xs text-gray-600 font-mono">{log.admin_id?.slice(0, 8)}…</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-400">{log.resource_type}</p>
                      {log.resource_id && <p className="text-xs text-gray-600 font-mono">{log.resource_id.slice(0, 8)}…</p>}
                    </td>
                    <td className="px-5 py-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-300 border border-green-700">
                          <CheckCircle className="w-3 h-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-300 border border-red-700">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      {log.ip_address && <p className="text-gray-600 mt-0.5">{log.ip_address}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > filters.pageSize && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setFilter('page', filters.page - 1)} disabled={filters.page === 1 || loading}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {filters.page} of {Math.ceil(total / filters.pageSize)}
          </span>
          <button onClick={() => setFilter('page', filters.page + 1)} disabled={filters.page * filters.pageSize >= total || loading}
            className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-700 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
