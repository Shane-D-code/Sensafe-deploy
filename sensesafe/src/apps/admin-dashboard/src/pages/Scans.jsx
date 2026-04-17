import React, { useState, useEffect } from 'react';
import { useRelativeTime } from '../hooks/useRelativeTime.js';
import { Camera, Eye, Clock, TrendingUp, X, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

function Scans() {
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({
    total_scans: 0, total_detections: 0, avg_duration_ms: 0,
    models: { windows: {count:0}, doors: {count:0}, hallways: {count:0}, stairs: {count:0} }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);

  const fetchScans = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API_BASE}/api/admin/scans`, {
        headers: { Authorization: `Bearer ${token}` }, params: { page_size: 50 }
      });
      setScans(r.data.scans || []);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const r = await axios.get(`${API_BASE}/api/admin/scans/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(r.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await Promise.all([fetchScans(), fetchStats()]);
      if (mounted) setIsLoading(false);
    };
    load();
    const iv = setInterval(() => { if (mounted) { fetchScans(); fetchStats(); } }, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const models = [
    { key: 'windows', label: 'Windows', color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-700' },
    { key: 'doors', label: 'Doors', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700' },
    { key: 'hallways', label: 'Hallways', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700' },
    { key: 'stairs', label: 'Stairs', color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-700' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ML Detection Scans</h1>
          <p className="text-gray-400 text-sm mt-0.5">Exit detection results from the Android app</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Live
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Camera, label: 'Total Scans', value: stats.total_scans, color: 'bg-blue-600' },
          { icon: Eye, label: 'Total Detections', value: stats.total_detections, color: 'bg-green-600' },
          { icon: Clock, label: 'Avg Duration', value: `${stats.avg_duration_ms || 0}ms`, color: 'bg-orange-600' },
          { icon: TrendingUp, label: 'Models Active', value: 4, color: 'bg-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Model breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Model Usage Breakdown</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {models.map(m => (
            <div key={m.key} className={`rounded-xl p-4 border ${m.bg}`}>
              <p className="text-xs text-gray-400">{m.label}</p>
              <p className={`text-2xl font-bold ${m.color} mt-1`}>{stats.models?.[m.key]?.count || 0}</p>
              <p className="text-xs text-gray-500 mt-1">scans</p>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Recent Scans</h2>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-gray-500">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2" />
          </div>
        ) : scans.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No scans yet — will appear when users use exit detection</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800 bg-gray-800/50">
                  <th className="px-5 py-3 text-left font-medium">Scan ID</th>
                  <th className="px-5 py-3 text-left font-medium">Detections</th>
                  <th className="px-5 py-3 text-left font-medium">Models Used</th>
                  <th className="px-5 py-3 text-left font-medium">Duration</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => (
                  <tr key={scan.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{scan.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/40 text-green-300 border border-green-700">
                        {scan.total_detections} objects
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{scan.models_used?.join(', ')}</td>
                    <td className="px-5 py-3 text-gray-400">{scan.scan_duration_ms}ms</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{useRelativeTime(scan.created_at)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => setSelectedScan(scan)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs transition-colors">
                        <Eye className="w-3 h-3" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Scan Details</h3>
              <button onClick={() => setSelectedScan(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Scan ID</p>
                <p className="font-mono text-xs text-gray-300">{selectedScan.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2">Detected Objects ({selectedScan.total_detections})</p>
                <div className="space-y-2">
                  {selectedScan.detections?.map((det, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3">
                      <p className="font-semibold text-gray-200 text-sm">{det.class} <span className="text-gray-500 font-normal">({det.model})</span></p>
                      <p className="text-xs text-gray-400 mt-1">Confidence: {(det.confidence * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">Position: ({det.x?.toFixed(0)}, {det.y?.toFixed(0)})</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scans;
