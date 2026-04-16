import React, { useState, useEffect } from 'react';
import { Camera, Eye, Clock, TrendingUp } from 'lucide-react';
import axios from 'axios';

function Scans() {
    const [scans, setScans] = useState([]);
    const [stats, setStats] = useState({
        total_scans: 0,
        total_detections: 0,
        avg_duration_ms: 0,
        overall_avg_confidence: 0,
        models: { windows: {count:0, avg_confidence:0, high_conf_rate:0, total_detections:0}, doors: {count:0, avg_confidence:0, high_conf_rate:0, total_detections:0}, hallways: {count:0, avg_confidence:0, high_conf_rate:0, total_detections:0}, stairs: {count:0, avg_confidence:0, high_conf_rate:0, total_detections:0} }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScan, setSelectedScan] = useState(null);

    // FIXED: Proper useEffect with cleanup to prevent infinite loops
    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            if (!isMounted) return;
            
            setIsLoading(true);
            try {
                await Promise.all([fetchScans(), fetchStats()]);
            } catch (error) {
                console.error('Error fetching scan data:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        
        fetchData();
        
        // Real-time polling every 3 seconds
        const interval = setInterval(() => {
            if (isMounted) {
                fetchScans();
                fetchStats();
            }
        }, 3000);
        
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []); // Empty array = runs once on mount

    const fetchScans = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.130:8000';
            const response = await axios.get(`${API_BASE}/api/admin/scans`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page_size: 50 }
            });
            setScans(response.data.scans || []);
        } catch (error) {
            console.error('Error fetching scans:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.130:8000';
            const response = await axios.get(`${API_BASE}/api/admin/scans/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading scans...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">ML Detection Scans</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <Camera className="h-8 w-8 text-blue-500" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Scans</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_scans}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <Eye className="h-8 w-8 text-green-500" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Detections</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.total_detections}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <Clock className="h-8 w-8 text-orange-500" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.avg_duration_ms}ms</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-500" />
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Models Used</p>
                            <p className="text-2xl font-bold text-gray-900">4</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Usage Stats */}
            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Model Usage</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Windows</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.models?.windows?.count || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Doors</p>
                        <p className="text-2xl font-bold text-green-600">{stats.models?.doors?.count || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Hallways</p>
                        <p className="text-2xl font-bold text-orange-600">{stats.models?.hallways?.count || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Stairs</p>
                        <p className="text-2xl font-bold text-purple-600">{stats.models?.stairs?.count || 0}</p>
                    </div>
                </div>
            </div>

            {/* Scans Table */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Scans</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scan ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detections</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Models</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {scans.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No scans found. Scans will appear here when users use the exit detection feature.
                                    </td>
                                </tr>
                            ) : (
                                scans.map((scan) => (
                                    <tr key={scan.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                            {scan.id.substring(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {scan.total_detections} objects
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {scan.models_used.join(', ')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {scan.scan_duration_ms}ms
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(scan.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button
                                                onClick={() => setSelectedScan(scan)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scan Details Modal */}
            {selectedScan && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Scan Details</h3>
                            <button
                                onClick={() => setSelectedScan(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Scan ID</p>
                                <p className="font-mono text-sm">{selectedScan.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Detections</p>
                                <p className="font-bold">{selectedScan.total_detections}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Detected Objects</p>
                                <div className="mt-2 space-y-2">
                                    {selectedScan.detections.map((det, idx) => (
                                        <div key={idx} className="p-3 bg-gray-50 rounded">
                                            <p className="font-semibold">{det.class} ({det.model})</p>
                                            <p className="text-sm text-gray-600">
                                                Confidence: {(det.confidence * 100).toFixed(1)}%
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Position: ({det.x.toFixed(0)}, {det.y.toFixed(0)})
                                            </p>
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
