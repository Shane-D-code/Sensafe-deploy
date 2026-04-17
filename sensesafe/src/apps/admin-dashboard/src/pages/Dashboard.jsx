import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Users, CheckCircle, Siren, RefreshCw,
  MapPin, Battery, Clock, TrendingUp, Activity, ArrowRight
} from 'lucide-react';
import { IncidentMap } from '../components/IncidentMap';
import { getSOSStats, getAllAlertsForAdmin, getAllUsers } from '../services/api';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </div>
);

const statusColors = {
  Active: 'bg-red-900/50 text-red-300 border border-red-700',
  Pending: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  Resolved: 'bg-green-900/50 text-green-300 border border-green-700',
  NEED_HELP: 'bg-red-900/50 text-red-300 border border-red-700',
  TRAPPED: 'bg-red-900/50 text-red-300 border border-red-700',
  INJURED: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  SAFE: 'bg-green-900/50 text-green-300 border border-green-700',
};

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

function Dashboard({ alerts, stats }) {
  const [sosStats, setSosStats] = useState({ active_sos: 0 });
  const [userCount, setUserCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchExtra = useCallback(async () => {
    try {
      const [sos, users] = await Promise.all([getSOSStats(), getAllUsers({ page_size: 1 })]);
      setSosStats({ active_sos: sos.active_sos || 0 });
      setUserCount(users.total || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchExtra();
    const iv = setInterval(fetchExtra, 10000);
    return () => clearInterval(iv);
  }, [fetchExtra]);

  const sosList = alerts.filter(a => a.alertType === 'SOS Alert').slice(0, 6);
  const incidentList = alerts.filter(a => a.alertType === 'Incident').slice(0, 6);
  const resolved = alerts.filter(a => a.status === 'Resolved').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Live emergency response overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Live — auto-refreshes every 5s
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Siren} label="Active SOS" value={sosStats.active_sos} color="bg-red-600" sub="Needs immediate response" />
        <StatCard icon={AlertTriangle} label="Total Incidents" value={stats.by_type?.INCIDENT || 0} color="bg-orange-600" sub="Reported by users" />
        <StatCard icon={CheckCircle} label="Resolved" value={resolved} color="bg-green-600" sub="Closed alerts" />
        <StatCard icon={Users} label="Registered Users" value={userCount} color="bg-blue-600" sub="App users" />
      </div>

      {/* Map */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Live Incident Map</h2>
        </div>
        <IncidentMap isAdmin={true} />
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SOS Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Siren className="w-4 h-4 text-red-400" /> SOS Alerts
            </h2>
            <Link to="/alerts" className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {sosList.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">No active SOS alerts</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-2.5 text-left font-medium">User</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium">Battery</th>
                  <th className="px-5 py-2.5 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {sosList.map((a) => (
                  <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3 text-gray-200 font-medium">{a.userName}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-800 text-gray-400'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`flex items-center gap-1 text-xs ${a.battery < 20 ? 'text-red-400' : 'text-gray-400'}`}>
                        <Battery className="w-3 h-3" />{a.battery ?? '—'}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(a.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Incidents Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Recent Incidents
            </h2>
            <Link to="/messages" className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {incidentList.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">No incidents reported</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="px-5 py-2.5 text-left font-medium">Description</th>
                  <th className="px-5 py-2.5 text-left font-medium">Severity</th>
                  <th className="px-5 py-2.5 text-left font-medium">Status</th>
                  <th className="px-5 py-2.5 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {incidentList.map((a) => (
                  <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3 text-gray-200 max-w-[160px] truncate">{a.description}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.severity === 'critical' || a.severity === 'high' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                        a.severity === 'medium' ? 'bg-orange-900/50 text-orange-300 border border-orange-700' :
                        'bg-yellow-900/50 text-yellow-300 border border-yellow-700'
                      }`}>
                        {a.severity || 'medium'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-800 text-gray-400'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{timeAgo(a.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
