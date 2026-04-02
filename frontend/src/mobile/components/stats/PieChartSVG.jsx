import React from 'react';

const PieChartSVG = ({ data, colors }) => {
    if (!data || data.length === 0) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;

    let currentAngle = 0;
    return (
        <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: '160px', height: 'auto', aspectRatio: '1', flexShrink: 0 }}>
            {data.map((item, idx) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                currentAngle = endAngle;
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);
                const x1 = 100 + 90 * Math.cos(startRad);
                const y1 = 100 + 90 * Math.sin(startRad);
                const x2 = 100 + 90 * Math.cos(endRad);
                const y2 = 100 + 90 * Math.sin(endRad);
                const largeArc = angle > 180 ? 1 : 0;
                const pathData = `M 100 100 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`;
                const midAngle = (startAngle + endAngle) / 2;
                const midRad = (midAngle - 90) * (Math.PI / 180);
                const labelX = 100 + 55 * Math.cos(midRad);
                const labelY = 100 + 55 * Math.sin(midRad);
                return (
                    <g key={item.label}>
                        <path d={pathData} fill={colors[idx % colors.length]} stroke="#000" strokeWidth="2" />
                        {percentage > 8 && (
                            <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle"
                                  fill="#fff" fontSize="11" fontWeight="800"
                                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                {percentage.toFixed(0)}%
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default PieChartSVG;
