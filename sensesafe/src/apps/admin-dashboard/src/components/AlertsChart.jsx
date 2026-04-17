import React from 'react';

function AlertsChart({ labels = [], sos = [], incidents = [], alerts = [] }) {
  if (!labels.length) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
        No data available
      </div>
    );
  }

  const width = 520;
  const height = 260;
  const pad = { top: 20, right: 20, bottom: 50, left: 40 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const maxVal = Math.max(...sos, ...incidents, ...alerts, 1);
  const yMax = Math.ceil(maxVal * 1.15);
  const xStep = cw / Math.max(labels.length - 1, 1);
  const yScale = ch / yMax;

  const pts = (data) => data.map((v, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + ch - v * yScale,
  }));

  const path = (points) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const sosP = pts(sos);
  const incP = pts(incidents);
  const altP = pts(alerts);

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i));

  const fmtDate = (d) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  const datasets = [
    { name: 'SOS', points: sosP, data: sos, color: '#ef4444' },
    { name: 'Incidents', points: incP, data: incidents, color: '#f97316' },
    { name: 'Alerts', points: altP, data: alerts, color: '#3b82f6' },
  ];

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid */}
        {yTicks.map((tick, i) => {
          const y = pad.top + ch - tick * yScale;
          return (
            <g key={i}>
              <line x1={pad.left} x2={pad.left + cw} y1={y} y2={y} stroke="#1f2937" strokeWidth="1" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{tick}</text>
            </g>
          );
        })}

        {/* X labels */}
        {labels.map((label, i) => {
          const x = pad.left + i * xStep;
          const show = labels.length <= 8 || i % Math.ceil(labels.length / 7) === 0;
          if (!show) return null;
          return (
            <text key={i} x={x} y={pad.top + ch + 18} textAnchor="middle" fontSize="10" fill="#6b7280">
              {fmtDate(label)}
            </text>
          );
        })}

        {/* Lines */}
        {datasets.map((ds, di) => (
          <g key={di}>
            <path d={path(ds.points)} fill="none" stroke={ds.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {ds.points.map((p, pi) => (
              <circle key={pi} cx={p.x} cy={p.y} r="3" fill={ds.color} stroke="#111827" strokeWidth="1.5">
                <title>{`${labels[pi]}: ${ds.data[pi]} ${ds.name}`}</title>
              </circle>
            ))}
          </g>
        ))}

        {/* Legend */}
        {datasets.map((ds, i) => (
          <g key={i} transform={`translate(${pad.left + i * 110}, ${pad.top + ch + 35})`}>
            <rect width="10" height="10" rx="2" fill={ds.color} />
            <text x="14" y="9" fontSize="11" fill="#9ca3af">{ds.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default AlertsChart;
