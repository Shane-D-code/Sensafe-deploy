import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, Activity, Clock } from 'lucide-react';
import { getAllAlertsForAdmin, getAllUsers, getAuditLogs, getSystemHealth, getAlertsOverTime } from '../services/api.js';
import AlertsChart from '../components/AlertsChart.jsx';

function Analytics() {
    const [counts, setCounts] = useState({
        users: 0,
        alerts: 0,
        health: 'Healthy',
        avgResponse: '1.2s'
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [chartData, setChartData] = useState({
        labels: [],
        sos: [],
        incidents: [],
        alerts: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [alertsData, usersData, logsData, healthData] = await Promise.all([
                    getAllAlertsForAdmin(),
                    getAllUsers({ page_size: 1 }), // Just need count
                    getAuditLogs({ page_size: 5 }),
                    getSystemHealth()
                ]);

                // Calculate active alerts (Active SOS + Active/Pending Incidents)
                // Note: getAllAlertsForAdmin returns { messages, stats }
                const activeAlerts = (alertsData.stats?.sos_count || 0) + (alertsData.stats?.incident_count || 0);

                setCounts({
                    users: usersData.total || 0,
                    alerts: activeAlerts,
                    health: healthData.status === 'healthy' ? '99.9%' : 'Degraded',
                    avgResponse: '2.3s' // Placeholder as we don't track response time in DB yet
                });

                // Map audit logs to activity
                const mappedActivity = (logsData.audit_logs || []).map(log => ({
                    id: log.id,
                    action: log.action.replace('_', ' '),
                    user: log.admin_email ? log.admin_email.split('@')[0] : 'System',
                    time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setRecentActivity(mappedActivity);

            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setIsLoading(false);
            }
        };

        const fetchChartData = async () => {
            try {
                setChartLoading(true);
                const data = await getAlertsOverTime(7); // Last 7 days
                setChartData({
                    labels: data.labels || [],
                    sos: data.sos || [],
                    incidents: data.incidents || [],
                    alerts: data.alerts || []
                });
                setLastUpdate(new Date());
            } catch (error) {
                console.error("Failed to load chart data", error);
            } finally {
                setChartLoading(false);
            }
        };

        fetchAnalytics();
        fetchChartData();
        
        const interval = setInterval(() => {
            fetchAnalytics();
            fetchChartData();
        }, 3000); // Refresh every 3s for real-time updates
        
        return () => clearInterval(interval);
    }, []);

    const stats = [
        {
            title: 'Total Users',
            value: isLoading ? '...' : counts.users,
            change: '+1%', // Placeholder
            changeType: 'positive',
            icon: Users,
        },
        {
            title: 'Active Alerts',
            value: isLoading ? '...' : counts.alerts,
            change: 'Live',
            changeType: 'negative', // High alerts is usually bad/attention-needed, but technically "activity"
            icon: AlertTriangle,
        },
        {
            title: 'System Uptime',
            value: isLoading ? '...' : counts.health,
            change: 'Normal',
            changeType: 'positive',
            icon: Activity,
        },
        {
            title: 'Avg Response Time',
            value: counts.avgResponse,
            change: '-0.1s',
            changeType: 'positive',
            icon: Clock,
        },
    ];

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600">Monitor system performance and user activity</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                                <Icon className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="mt-4">
                                <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {stat.change}
                                </span>
                                <span className="text-sm text-gray-600 ml-1">status</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts Over Time Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Alerts Over Time (Last 7 Days)</h2>
                        <div className="flex items-center space-x-2">
                            {lastUpdate && (
                                <span className="text-xs text-gray-500">
                                    Updated: {lastUpdate.toLocaleTimeString()}
                                </span>
                            )}
                            <div className={`w-2 h-2 rounded-full ${chartLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                        </div>
                    </div>
                    {chartLoading && !chartData.labels.length ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <AlertsChart
                            labels={chartData.labels}
                            sos={chartData.sos}
                            incidents={chartData.incidents}
                            alerts={chartData.alerts}
                        />
                    )}
                    <div className="mt-4 text-xs text-gray-500 text-center">
                        Auto-refreshes every 3 seconds • Real-time data from mobile app
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                        {isLoading ? (
                            <p className="text-center text-gray-500">Loading activity...</p>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-center text-gray-500">No recent activity.</p>
                        ) : (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {activity.action}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            by {activity.user} • {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Additional Analytics Section */}
            <div className="mt-8 bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">System Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">CPU Usage</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">45% average</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Memory Usage</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">67% average</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-600 mb-2">Storage Usage</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">78% used</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
