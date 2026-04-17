import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Battery, Clock, User, AlertTriangle,
  Siren, Flame, CheckCircle, Shield
} from 'lucide-react';
import { resolveSOS, resolveIncident, markMessageAsRead } from '../services/api.js';

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

const Field = ({ label, value, mono }) => (
  <div className="py-3 border-b border-gray-800 last:border-0">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-sm text-gray-200 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
  </div>
);

function AlertDetail({ alerts }) {
  const { id } = useParams();
  const [localAlert, setLocalAlert] = useState(null);
  const [resolving, setResolving] = useState(false);

  const alert = localAlert || alerts.find(a => a.id === id);

  if (!alert) {
    return (
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Alert not found</p>
          <Link to="/alerts" className="mt-4 inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300">
            <ArrowLeft className="w-4 h-4" /> Back to Alerts
          </Link>
        </div>
      </div>
    );
  }

  const handleResolve = async () => {
    setResolving(true);
    try {
      let newStatus = 'RESOLVED';
      if (alert.message_type === 'SOS') {
        await resolveSOS(alert.id);
        newStatus = 'SAFE';
      } else if (alert.message_type === 'INCIDENT') {
        await resolveIncident(alert.id);
      } else {
        await markMessageAsRead(alert.id);
      }
      setLocalAlert({ ...alert, is_read: true, status: newStatus });
    } catch (e) {
      console.error('Resolve failed:', e);
    } finally {
      setResolving(false);
    }
  };

  const TypeIcon = alert.alertType === 'SOS Alert' ? Siren :
    alert.alertType === 'Incident' ? Flame : AlertTriangle;
  const typeColor = alert.alertType === 'SOS Alert' ? 'text-red-400' :
    alert.alertType === 'Incident' ? 'text-orange-400' : 'text-blue-400';

  const isResolved = alert.status === 'Resolved' || alert.is_read;

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Back */}
      <Link to="/alerts" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Alerts
      </Link>

      {/* Header card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              alert.alertType === 'SOS Alert' ? 'bg-red-900/50 border border-red-700' :
              alert.alertType === 'Incident' ? 'bg-orange-900/50 border border-orange-700' :
              'bg-blue-900/50 border border-blue-700'
            }`}>
              <TypeIcon className={`w-5 h-5 ${typeColor}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{alert.alertType}</h1>
              <p className="text-gray-400 text-sm">{alert.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isResolved ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-red-900/50 text-red-300 border-red-700'
            }`}>
              {isResolved ? 'Resolved' : 'Active'}
            </span>
            {!isResolved && (
              <button onClick={handleResolve} disabled={resolving}
                className="flex items-center gap-2 px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                <CheckCircle className="w-4 h-4" />
                {resolving ? 'Resolving...' : 'Resolve'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User & Alert Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> User Information
          </h2>
          <Field label="User Name" value={alert.userName} />
          <Field label="Alert Type" value={alert.alertType} />
          <Field label="Ability / Category" value={alert.userCategory || alert.ability || 'None'} />
          {alert.isVulnerable && (
            <div className="py-3 border-b border-gray-800">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-900/40 border border-orange-700 text-orange-300 rounded-full text-xs font-medium">
                <Shield className="w-3 h-3" /> Vulnerable User
              </span>
            </div>
          )}
          <Field label="Severity" value={alert.severity} />
        </div>

        {/* Time & Location */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Time & Location
          </h2>
          <Field label="Timestamp" value={alert.timestamp ? new Date(alert.timestamp).toLocaleString() : '—'} />
          <Field label="Time Ago" value={timeAgo(alert.timestamp)} />
          <Field label="Location" value={alert.location} mono />
          {alert.battery !== undefined && (
            <div className="py-3 border-b border-gray-800">
              <p className="text-xs text-gray-500 mb-1">Battery</p>
              <div className="flex items-center gap-2">
                <Battery className={`w-4 h-4 ${alert.battery < 20 ? 'text-red-400' : 'text-green-400'}`} />
                <span className={`text-sm font-medium ${alert.battery < 20 ? 'text-red-400' : 'text-gray-200'}`}>
                  {alert.battery}%
                </span>
                {alert.battery < 20 && <span className="text-xs text-red-400">Critical</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Description</h2>
        <p className="text-gray-300 text-sm leading-relaxed">{alert.description || 'No description provided.'}</p>
      </div>

      {/* Raw ID */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Alert ID</h2>
        <p className="text-gray-400 text-xs font-mono break-all">{alert.id}</p>
      </div>
    </div>
  );
}

export default AlertDetail;
