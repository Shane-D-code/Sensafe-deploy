import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Activity, Clock, RefreshCw } from 'lucide-react';
import { getAllAlertsForAdmin, getAllUsers, getAuditLogs, getSystemHealth, getAlertsOverTime } from '../services/api.js';
import AlertsChart from '../components/AlertsChart.jsx';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
    </div>
  </div>
);

function Analytics() {
  const [counts, setCounts] = useState({ users: 0, alerts: 0, health: '—' });
  const [recentActivity, setRecentActivity] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], sos: [], incidents: [], alerts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAll = async () => {
    try {
      const [alertsData, usersData, logsData, healthData, chartRaw] = await Promise.all([
        getAllAlertsForAdmin(),
        getAllUsers({ page_size: 1 }),
        getAuditLogs({ page_size: 5 }),
        getSystemHealth(),
        getAlertsOverTime(7),
      ]);

      const activeAlerts = (alertsData.stats?.sos_count || 0) + (alertsData.stats?.incident_count || 0);
      setCounts({
        users: usersData.total || 0,
        alerts: activeAlerts,
        health: healthData.status === 'healthy' ? 'Healthy' : 'Degraded',
      });

      setRecentActivity((logsData.audit_logs || []).map(log => ({
        id: log.id,
        action: log.action.replace(/_/g, ' '),
        user: log.admin_email ? log.admin_email.split('@')[0] : 'System',
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        success: log.success,
      })));

      setChartData({
        labels: chartRaw.labels || [],
        sos: chartRaw.sos || [],
        incidents: chartRaw.incidents || [],
        alerts: chartRaw.alerts || [],
      });

      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 10000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 text-sm mt-0.5">System performance and activity overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {lastUpdate && <span>Updated {lastUpdate.toLocaleTimeString()}</span>}
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={isLoading ? '…' : counts.users} color="bg-blue-600" sub="Registered in app" />
        <StatCard icon={AlertTriangle} label="Active Alerts" value={isLoading ? '…' : counts.alerts} color="bg-red-600" sub="SOS + Incidents" />
        <StatCard icon={Activity} label="System Health" value={isLoading ? '…' : counts.health} color={counts.health === 'Healthy' ? 'bg-green-600' : 'bg-yellow-600'} />
        <StatCard icon={Clock} label="Auto-refresh" value="10s" color="bg-gray-700" sub="Real-time data" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Alerts Over Time (Last 7 Days)</h2>
          {isLoading && !chartData.labels.length ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-600" />
            </div>
          ) : (
            <AlertsChart
              labels={chartData.labels}
              sos={chartData.sos}
              incidents={chartData.incidents}
              alerts={chartData.alerts}
            />
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Recent Admin Activity</h2>
          {isLoading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${a.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm text-gray-300 capitalize">{a.action.toLowerCase()}</p>
                    <p className="text-xs text-gray-500">{a.user} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
