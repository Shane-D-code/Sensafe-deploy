import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import AlertDetail from './pages/AlertDetail';
import Messages from './pages/Messages';
import AdminActions from './pages/AdminActions';
import Login from './pages/Login';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import Scans from './pages/Scans';
import { getAllAlertsForAdmin } from './services/api.js';

function App() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, by_type: { SOS: 0, INCIDENT: 0, GENERAL: 0 } });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'));

  const fetchData = useCallback(async () => {
    try {
      const data = await getAllAlertsForAdmin();
      const messagesList = Array.isArray(data?.messages) ? data.messages : [];
      const statsData = data?.stats || {};

      const alertsList = messagesList.map(msg => ({
        id: msg.id,
        userName: msg.user_name || 'Unknown User',
        alertType: msg.message_type === 'SOS' ? 'SOS Alert' : msg.message_type === 'INCIDENT' ? 'Incident' : 'Message',
        userCategory: msg.ability || msg.category || 'Normal',
        isVulnerable: !!(msg.ability && msg.ability !== 'NONE'),
        timestamp: msg.created_at || new Date().toISOString(),
        status: msg.is_read ? 'Resolved' : 'Active',
        description: msg.content || msg.title || 'No description',
        riskScore: msg.severity === 'critical' ? 95 : msg.severity === 'high' ? 75 : msg.severity === 'medium' ? 50 : 25,
        location: msg.lat && msg.lng ? `${Number(msg.lat).toFixed(4)}, ${Number(msg.lng).toFixed(4)}` : null,
        category: msg.category,
        severity: msg.severity,
        ability: msg.ability,
        battery: msg.battery,
        is_read: msg.is_read,
      }));

      setAlerts(alertsList);
      setStats({
        total: statsData.total || alertsList.length,
        unread: statsData.unread || alertsList.filter(m => !m.is_read).length,
        by_type: statsData.by_type || {
          SOS: alertsList.filter(m => m.alertType === 'SOS Alert').length,
          INCIDENT: alertsList.filter(m => m.alertType === 'Incident').length,
          GENERAL: alertsList.filter(m => m.alertType === 'Message').length,
        }
      });
    } catch (error) {
      if (!localStorage.getItem('token')) {
        setIsLoggedIn(false);
        return;
      }
      setAlerts([]);
      setStats({ total: 0, unread: 0, by_type: { SOS: 0, INCIDENT: 0, GENERAL: 0 } });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn, fetchData]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [isLoggedIn, fetchData]);

  const handleLogin = (success) => {
    if (success) { setIsLoggedIn(true); fetchData(); }
  };

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex w-full min-h-screen bg-gray-950">
        <Sidebar unreadCount={stats.unread} activeSOS={stats.by_type?.SOS || 0} />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto" />
                <p className="mt-4 text-gray-400 text-sm">Loading from backend…</p>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard alerts={alerts} stats={stats} />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/alerts/:id" element={<AlertDetail alerts={alerts} />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/admin-actions" element={<AdminActions />} />
              <Route path="/users" element={<Users />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/scans" element={<Scans />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App;
