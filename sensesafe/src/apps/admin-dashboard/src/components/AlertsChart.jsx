import React from 'react';

/**
 * Alerts Over Time Chart Component
 * 
 * Displays a line chart showing SOS alerts, incidents, and system alerts over time.
 * Pure React/SVG implementation (no D3 dependencies).
 * 
 * @param {Object} props
 * @param {Array} props.labels - Array of date strings (e.g., ["2026-04-10", "2026-04-11"])
 * @param {Array} props.sos - Array of SOS alert counts per day
 * @param {Array} props.incidents - Array of incident counts per day
 * @param {Array} props.alerts - Array of system alert counts per day
 */
function AlertsChart({ labels = [], sos = [], incidents = [], alerts = [] }) {
    if (!labels.length) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-500">
                No data available
            </div>
        );
    }

    // Chart dimensions
    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 120, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max value for scaling
    const maxValue = Math.max(
        ...sos,
        ...incidents,
        ...alerts,
        1 // Minimum 1 to avoid division by zero
    );
    const yMax = Math.ceil(maxValue * 1.1); // Add 10% padding

    // Calculate scales
    const xStep = chartWidth / (labels.length - 1 || 1);
    const yScale = chartHeight / yMax;

    // Generate points for each dataset
    const generatePoints = (data) => {
        return data.map((value, index) => ({
            x: padding.left + index * xStep,
            y: padding.top + chartHeight - (value * yScale)
        }));
    };

    const sosPoints = generatePoints(sos);
    const incidentPoints = generatePoints(incidents);
    const alertPoints = generatePoints(alerts);

    // Generate path string
    const generatePath = (points) => {
        if (points.length === 0) return '';
        return points.map((point, index) => 
            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        ).join(' ');
    };

    // Format date for display (MM/DD)
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    // Datasets configuration
    const datasets = [
        { name: 'SOS Alerts', data: sos, points: sosPoints, color: '#ef4444' },
        { name: 'Incidents', data: incidents, points: incidentPoints, color: '#f59e0b' },
        { name: 'System Alerts', data: alerts, points: alertPoints, color: '#3b82f6' }
    ];

    // Y-axis ticks
    const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((yMax / 5) * i));

    return (
        <div className="w-full overflow-x-auto">
            <svg width={width} height={height} className="mx-auto">
                {/* Grid lines */}
                {yTicks.map((tick, index) => {
                    const y = padding.top + chartHeight - (tick * yScale);
                    return (
                        <line
                            key={`grid-${index}`}
                            x1={padding.left}
                            x2={padding.left + chartWidth}
                            y1={y}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Y-axis */}
                <line
                    x1={padding.left}
                    x2={padding.left}
                    y1={padding.top}
                    y2={padding.top + chartHeight}
                    stroke="#6b7280"
                    strokeWidth="2"
                />

                {/* X-axis */}
                <line
                    x1={padding.left}
                    x2={padding.left + chartWidth}
                    y1={padding.top + chartHeight}
                    y2={padding.top + chartHeight}
                    stroke="#6b7280"
                    strokeWidth="2"
                />

                {/* Y-axis labels */}
                {yTicks.map((tick, index) => {
                    const y = padding.top + chartHeight - (tick * yScale);
                    return (
                        <text
                            key={`y-label-${index}`}
                            x={padding.left - 10}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="12"
                            fill="#6b7280"
                        >
                            {tick}
                        </text>
                    );
                })}

                {/* X-axis labels */}
                {labels.map((label, index) => {
                    const x = padding.left + index * xStep;
                    const showLabel = labels.length <= 10 || index % Math.ceil(labels.length / 7) === 0;
                    if (!showLabel) return null;
                    
                    return (
                        <text
                            key={`x-label-${index}`}
                            x={x}
                            y={padding.top + chartHeight + 20}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#6b7280"
                            transform={`rotate(-45 ${x} ${padding.top + chartHeight + 20})`}
                        >
                            {formatDate(label)}
                        </text>
                    );
                })}

                {/* Y-axis title */}
                <text
                    x={-chartHeight / 2 - padding.top}
                    y={15}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#6b7280"
                    transform="rotate(-90)"
                >
                    Number of Alerts
                </text>

                {/* Draw lines and points for each dataset */}
                {datasets.map((dataset, datasetIndex) => (
                    <g key={`dataset-${datasetIndex}`}>
                        {/* Line */}
                        <path
                            d={generatePath(dataset.points)}
                            fill="none"
                            stroke={dataset.color}
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />

                        {/* Points */}
                        {dataset.points.map((point, pointIndex) => (
                            <g key={`point-${datasetIndex}-${pointIndex}`}>
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="4"
                                    fill={dataset.color}
                                    stroke="#fff"
                                    strokeWidth="2"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <title>
                                        {`${labels[pointIndex]}: ${dataset.data[pointIndex]} ${dataset.name}`}
                                    </title>
                                </circle>
                            </g>
                        ))}
                    </g>
                ))}

                {/* Legend */}
                {datasets.map((dataset, index) => (
                    <g key={`legend-${index}`} transform={`translate(${padding.left + chartWidth + 10}, ${padding.top + index * 25})`}>
                        <rect
                            width="15"
                            height="15"
                            fill={dataset.color}
                        />
                        <text
                            x="20"
                            y="12"
                            fontSize="12"
                            fill="#333"
                        >
                            {dataset.name}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

export default AlertsChart;
