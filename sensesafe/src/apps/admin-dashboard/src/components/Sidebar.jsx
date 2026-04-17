import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, MessageCircle, Settings, Users,
  BarChart3, ClipboardList, Shield, Siren, Camera, LogOut, ChevronLeft, ChevronRight, Bell
} from 'lucide-react';

function Sidebar({ unreadCount = 0, activeSOS = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts', badge: activeSOS, badgeColor: 'bg-red-500' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadCount, badgeColor: 'bg-orange-500' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/scans', icon: Camera, label: 'ML Scans' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin-actions', icon: Shield, label: 'Admin Actions' },
    { path: '/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className={`relative flex flex-col bg-gray-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-700 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Siren className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm leading-tight">SenseSafe</p>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : ''}
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.label}</span>}
              {!collapsed && item.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-red-500'} text-white font-bold`}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {collapsed && item.badge > 0 && (
                <span className="absolute right-1 top-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className={`border-t border-gray-700 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(user.name || user.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user.name || 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email || ''}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-2 text-gray-400 hover:text-red-400 text-xs px-2 py-1.5 rounded hover:bg-gray-800 w-full transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
