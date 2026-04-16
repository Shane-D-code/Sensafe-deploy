import React, { useRef, useEffect, useState, useCallback } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { select } from 'd3-selection';
import { scaleThreshold } from 'd3-scale';
import { interpolateReds } from 'd3-scale-chromatic';
import { json } from 'd3-fetch';
import { RotateCcw, Map as MapIcon, Loader2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

// API Configuration
const API_BASE_URL = 'http://192.168.0.130:8000';

// Use same color scale for incidents
const COLOR_SCALE = interpolateReds;

// Mock Data (reused for now, but in real app this would come from props/api)
const MOCK_INCIDENT_DATA = [
    { id: 1, type: 'Flood', state: 'Kerala', severity: 'High', count: 12 },
    { id: 2, type: 'Fire', state: 'Maharashtra', severity: 'High', count: 8 },
    { id: 3, type: 'Earthquake', state: 'Gujarat', severity: 'High', count: 5 },
    { id: 4, type: 'Medical', state: 'Delhi', severity: 'Medium', count: 25 },
    { id: 5, type: 'Road Accident', state: 'Uttar Pradesh', severity: 'High', count: 15 },
    { id: 6, type: 'Flood', state: 'Assam', severity: 'High', count: 18 },
    { id: 7, type: 'Other', state: 'Karnataka', severity: 'Low', count: 10 },
    { id: 8, type: 'Fire', state: 'Tamil Nadu', severity: 'Medium', count: 7 },
    { id: 9, type: 'Medical', state: 'West Bengal', severity: 'High', count: 12 },
    { id: 10, type: 'Flood', state: 'Bihar', severity: 'High', count: 20 },
    { id: 11, type: 'Road Accident', state: 'Rajasthan', severity: 'Medium', count: 9 },
    { id: 12, type: 'Other', state: 'Madhya Pradesh', severity: 'Low', count: 6 },
    { id: 13, type: 'Fire', state: 'Punjab', severity: 'High', count: 4 },
    { id: 14, type: 'Medical', state: 'Telangana', severity: 'Medium', count: 11 },
    { id: 15, type: 'Flood', state: 'Odisha', severity: 'High', count: 14 },
];

const STATE_NAMES = {
    'Andaman & Nicobar Island': 'Andaman and Nicobar',
    'Andhra Pradesh': 'Andhra Pradesh',
    'Arunanchal Pradesh': 'Arunachal Pradesh',
    'Assam': 'Assam',
    'Bihar': 'Bihar',
    'Chandigarh': 'Chandigarh',
    'Chhattisgarh': 'Chhattisgarh',
    'Dadara & Nagar Havelli': 'Dadra and Nagar Haveli',
    'Daman & Diu': 'Daman and Diu',
    'Delhi': 'Delhi',
    'Goa': 'Goa',
    'Gujarat': 'Gujarat',
    'Haryana': 'Haryana',
    'Himachal Pradesh': 'Himachal Pradesh',
    'Jammu & Kashmir': 'Jammu and Kashmir',
    'Jharkhand': 'Jharkhand',
    'Karnataka': 'Karnataka',
    'Kerala': 'Kerala',
    'Lakshadweep': 'Lakshadweep',
    'Madhya Pradesh': 'Madhya Pradesh',
    'Maharashtra': 'Maharashtra',
    'Manipur': 'Manipur',
    'Meghalaya': 'Meghalaya',
    'Mizoram': 'Mizoram',
    'Nagaland': 'Nagaland',
    'Odisha': 'Odisha',
    'Puducherry': 'Puducherry',
    'Punjab': 'Punjab',
    'Rajasthan': 'Rajasthan',
    'Sikkim': 'Sikkim',
    'Tamil Nadu': 'Tamil Nadu',
    'Telangana': 'Telangana',
    'Tripura': 'Tripura',
    'Uttar Pradesh': 'Uttar Pradesh',
    'Uttarakhand': 'Uttarakhand',
    'West Bengal': 'West Bengal',
};

export function IncidentMap({ className, isAdmin = false }) {
    const svgRef = useRef(null);
    const [hoveredState, setHoveredState] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [zoomedState, setZoomedState] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [geoDataCache, setGeoDataCache] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [disasterData, setDisasterData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch disaster map data from backend
    const fetchDisasterData = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const response = await fetch(`${API_BASE_URL}/api/disaster-map/heatmap`);
            if (!response.ok) throw new Error('Failed to fetch disaster data');
            const data = await response.json();
            setDisasterData(data);
            setLastUpdated(new Date());
            console.log('✅ Disaster map data loaded:', data);
        } catch (error) {
            console.error('❌ Error fetching disaster data:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // Fetch data on mount and set up auto-refresh
    useEffect(() => {
        fetchDisasterData();
        const interval = setInterval(fetchDisasterData, 600000); // 10 minutes
        return () => clearInterval(interval);
    }, [fetchDisasterData]);

    const resetView = useCallback(() => {
        setZoomedState(null);
    }, []);

    const getStateDisasterData = useCallback((stateName) => {
        if (!disasterData) return null;
        
        // Normalize state name for matching
        const normalizedName = stateName.trim();
        
        // Find state in disaster data
        const stateData = disasterData.states.find(s => 
            s.name.toLowerCase() === normalizedName.toLowerCase() ||
            s.name.toLowerCase().includes(normalizedName.toLowerCase()) ||
            normalizedName.toLowerCase().includes(s.name.toLowerCase())
        );
        
        return stateData;
    }, [disasterData]);

    const getIncidentCount = useCallback((stateName) => {
        const stateData = getStateDisasterData(stateName);
        return stateData?.incident_count || 0;
    }, [getStateDisasterData]);

    const getStateColor = useCallback((stateName) => {
        const stateData = getStateDisasterData(stateName);
        if (!stateData || stateData.incident_count === 0) {
            return '#f1f5f9'; // slate-100 for no incidents
        }
        // Use the color from disaster map API
        return stateData.color;
    }, [getStateDisasterData]);

    useEffect(() => {
        if (!svgRef.current) return;

        // Use container dimensions or fixed
        const width = 600;
        const height = 500; // slightly shorter for dashboard

        const svg = select(svgRef.current);
        svg.selectAll('*').remove();

        const projection = geoMercator()
            .center([78.9, 22.5])
            .scale(zoomedState ? 2000 : 800) // Adjusted scale for dashboard view
            .translate([width / 2, height / 2]);

        const path = geoPath().projection(projection);

        if (zoomedState && geoDataCache) {
            const selectedFeature = geoDataCache.features.find(
                (f) => f.properties.ST_NM === zoomedState
            );
            if (selectedFeature) {
                const bounds = path.bounds(selectedFeature);
                const [[x0, y0], [x1, y1]] = bounds;
                const centerX = (x0 + x1) / 2;
                const centerY = (y0 + y1) / 2;
                // Adjust for desired center
                const newCenter = projection.invert ? projection.invert([centerX, centerY]) : null;
                if (newCenter) {
                    projection.center(newCenter);
                }
                projection.translate([width / 2, height / 2]);
            }
        }

        // Color scale 0-50 incidents
        const colorScale = scaleThreshold()
            .domain([5, 10, 20, 40])
            .range([
                COLOR_SCALE(0.1),
                COLOR_SCALE(0.3),
                COLOR_SCALE(0.5),
                COLOR_SCALE(0.7),
                COLOR_SCALE(0.9),
            ]);

        const loadData = async () => {
            try {
                let topology = geoDataCache;
                if (!topology) {
                    topology = await json('https://gist.githubusercontent.com/jbrobst/56c13bbbf9d97d187fea01ca62ea5112/raw/e388c4cae20aa53cb5090210a42ebb9b765c0a36/india_states.geojson');
                    setGeoDataCache(topology);
                }
                setIsLoading(false);

                const states = zoomedState
                    ? topology.features.filter((f) => f.properties.ST_NM === zoomedState)
                    : topology.features;

                const stateGroups = svg
                    .selectAll('g.state')
                    .data(states)
                    .enter()
                    .append('g')
                    .attr('class', 'state');

                stateGroups
                    .append('path')
                    .attr('d', path)
                    .attr('fill', (d) => {
                        return getStateColor(d.properties.ST_NM);
                    })
                    .attr('stroke', '#cbd5e1') // slate-300
                    .attr('stroke-width', zoomedState ? 2 : 1)
                    .style('cursor', 'pointer')
                    .style('transition', 'all 0.2s ease')
                    .on('mouseenter', function (event, d) {
                        const count = getIncidentCount(d.properties.ST_NM);
                        const stateData = getStateDisasterData(d.properties.ST_NM);
                        
                        select(this)
                            .attr('stroke', '#64748b')
                            .attr('stroke-width', 2);

                        if (count > 0) {
                            const nativeEvent = event.nativeEvent || event;
                            setHoveredState({
                                name: d.properties.ST_NM,
                                count,
                                intensity: stateData?.intensity || 0,
                                incidents: stateData?.incidents || []
                            });
                            setMousePos({ 
                                x: nativeEvent.offsetX || nativeEvent.layerX || 0, 
                                y: nativeEvent.offsetY || nativeEvent.layerY || 0 
                            });
                        }
                    })

                    .on('mousemove', (event) => {
                        const nativeEvent = event.nativeEvent || event;
                        // Use offset position relative to SVG for simpler positioning inside container if absolute
                        setMousePos({ 
                            x: nativeEvent.offsetX || nativeEvent.layerX || 0, 
                            y: nativeEvent.offsetY || nativeEvent.layerY || 0 
                        });
                    })

                    .on('mouseleave', function () {
                        select(this)
                            .attr('stroke', '#cbd5e1')
                            .attr('stroke-width', zoomedState ? 2 : 1);
                        setHoveredState(null);
                    })
                    .on('dblclick', (event, d) => {
                        event.stopPropagation();
                        setZoomedState(zoomedState === d.properties.ST_NM ? null : d.properties.ST_NM);
                    });

            } catch (error) {
                console.error("Error loading map data", error);
                setIsLoading(false);
            }
        };

        loadData();

    }, [zoomedState, filterType, geoDataCache, getIncidentCount, getStateColor, getStateDisasterData]);

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
            {/* Map Section */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden relative border border-slate-200">
                <div className="flex flex-row items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                            <MapIcon className="w-5 h-5 text-indigo-600" />
                            India Incident Map
                        </h3>
                        <p className="text-sm text-gray-500">
                            Real-time disaster tracking powered by NewsData.io
                        </p>
                        {lastUpdated && (
                            <p className="text-xs text-gray-400 mt-1">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchDisasterData}
                            disabled={isRefreshing}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>

                        {zoomedState && (
                            <button onClick={resetView} className="flex items-center px-2 py-1 text-xs border rounded hover:bg-slate-100">
                                <RotateCcw className="w-3 h-3 mr-1" /> Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-0 relative h-[500px] flex items-center justify-center bg-slate-50">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 transition-opacity">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                <span className="text-sm font-medium text-gray-500">Loading Map Data...</span>
                            </div>
                        </div>
                    )}

                    <svg
                        ref={svgRef}
                        viewBox="0 0 600 500"
                        className="w-full h-full max-h-[500px] animate-in fade-in duration-700"
                    />

                    {/* Tooltip - Absolute positioned within container */}
                    {hoveredState && (
                        <div
                            className="absolute bg-slate-900/90 text-white px-3 py-2 rounded shadow-xl z-50 pointer-events-none text-xs max-w-xs"
                            style={{
                                left: `${mousePos.x + 10}px`,
                                top: `${mousePos.y - 40}px`,
                            }}
                        >
                            <div className="font-bold">{hoveredState.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="font-mono">{hoveredState.count} Incident{hoveredState.count !== 1 ? 's' : ''}</span>
                            </div>
                            {hoveredState.intensity > 0 && (
                                <div className="text-xs text-gray-300 mt-1">
                                    Intensity: {(hoveredState.intensity * 100).toFixed(0)}%
                                </div>
                            )}
                            {hoveredState.incidents && hoveredState.incidents.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="text-xs text-gray-300">Recent:</div>
                                    {hoveredState.incidents.slice(0, 2).map((incident, i) => (
                                        <div key={i} className="text-xs text-gray-200 mt-1 capitalize">
                                            • {incident.type} ({incident.severity})
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 p-2 bg-white/90 backdrop-blur rounded border border-slate-200 shadow text-[10px]">
                        <p className="font-semibold mb-1">Incident Intensity</p>
                        <div className="flex items-center gap-1">
                            <span className="w-6 h-1.5 rounded-[1px]" style={{ background: COLOR_SCALE(0.1) }}></span>
                            <span className="w-6 h-1.5 rounded-[1px]" style={{ background: COLOR_SCALE(0.3) }}></span>
                            <span className="w-6 h-1.5 rounded-[1px]" style={{ background: COLOR_SCALE(0.5) }}></span>
                            <span className="w-6 h-1.5 rounded-[1px]" style={{ background: COLOR_SCALE(0.7) }}></span>
                            <span className="w-6 h-1.5 rounded-[1px]" style={{ background: COLOR_SCALE(0.9) }}></span>
                        </div>
                        <div className="flex justify-between mt-1 text-slate-500 px-1">
                            <span>Low</span>
                            <span>High</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
                    <h3 className="text-lg font-bold mb-4">Disaster Summary</h3>
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                            <h4 className="text-sm font-medium text-red-800 mb-1">Total Active Incidents</h4>
                            <p className="text-3xl font-bold text-red-600">
                                {disasterData?.summary?.total_incidents || 0}
                            </p>
                            <p className="text-xs text-red-600/70 mt-1">
                                {disasterData?.summary?.states_affected || 0} states affected
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium text-gray-700">
                                <span>Top Affected States</span>
                                <span>Count</span>
                            </div>
                            {disasterData?.states
                                ?.filter(s => s.incident_count > 0)
                                .sort((a, b) => b.incident_count - a.incident_count)
                                .slice(0, 5)
                                .map((state, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-slate-100 transition-colors cursor-default text-sm">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: state.color }}
                                            />
                                            <span className="text-gray-700">{state.name}</span>
                                        </div>
                                        <span className="font-mono font-semibold text-gray-900">{state.incident_count}</span>
                                    </div>
                                )) || (
                                <div className="text-sm text-gray-500 text-center py-4">
                                    No incidents reported
                                </div>
                            )}
                        </div>

                        {disasterData?.summary?.incident_types && (
                            <div className="pt-4 border-t border-gray-200">
                                <div className="text-sm font-medium text-gray-700 mb-2">Incident Types</div>
                                <div className="space-y-1">
                                    {Object.entries(disasterData.summary.incident_types)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([type, count]) => (
                                            <div key={type} className="flex justify-between text-sm">
                                                <span className="text-gray-600 capitalize">{type}</span>
                                                <span className="font-semibold text-gray-900">{count}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
