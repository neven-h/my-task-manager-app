import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { SYS, fmt } from './renovationConstants';

const PIE_COLORS = ['#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF6B35', '#7B2CBF', '#06D6A0', '#F72585', '#4361EE', '#F77F00'];

const RenovationChart = ({ filtered, groupMode }) => {
    const chartData = useMemo(() => {
        const map = {};
        const fallback = groupMode === 'contractor' ? 'Unassigned' : groupMode === 'category' ? 'Uncategorized' : 'Other';
        filtered.forEach(item => {
            let key;
            if (groupMode === 'contractor') key = (item.contractor || '').trim() || fallback;
            else if (groupMode === 'category') key = (item.category || '').trim() || fallback;
            else key = (item.area || '').trim() || fallback;
            if (!map[key]) map[key] = { paid: 0, estimated: 0, count: 0 };
            map[key].paid += item.total_paid ?? 0;
            map[key].estimated += item.estimated_cost ?? 0;
            map[key].count += 1;
        });
        const entries = Object.entries(map).sort(([a], [b]) => {
            if (a === fallback) return 1;
            if (b === fallback) return -1;
            return b[1].paid - a[1].paid;
        });
        const totalPaid = entries.reduce((s, [, d]) => s + d.paid, 0);
        return { entries, totalPaid };
    }, [filtered, groupMode]);

    if (chartData.totalPaid <= 0) return null;

    const { entries, totalPaid } = chartData;
    const maxBar = Math.max(...entries.map(([, d]) => Math.max(d.paid, d.estimated)));

    return (
        <div style={{ border: `2px solid ${SYS.border}`, padding: '1.25rem', marginBottom: 20, background: '#fff' }}>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart size={18} color={SYS.primary} />
                Spending by {groupMode === 'contractor' ? 'Contractor' : groupMode === 'category' ? 'Category' : 'Area'}
            </h2>

            {/* Pie + Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 220 }}>
                        {entries.length === 1 ? (
                            <g>
                                <circle cx="100" cy="100" r="90" fill={PIE_COLORS[0]} stroke="#000" strokeWidth="2" />
                                <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="14" fontWeight="800">100%</text>
                            </g>
                        ) : (() => {
                            let angle = 0;
                            return entries.map(([key, data], i) => {
                                const pct = (data.paid / totalPaid) * 100;
                                const sweep = (pct / 100) * 360;
                                const s = angle; const e = angle + sweep; angle = e;
                                const sr = (s - 90) * Math.PI / 180;
                                const er = (e - 90) * Math.PI / 180;
                                const x1 = 100 + 90 * Math.cos(sr), y1 = 100 + 90 * Math.sin(sr);
                                const x2 = 100 + 90 * Math.cos(er), y2 = 100 + 90 * Math.sin(er);
                                const d = `M 100 100 L ${x1} ${y1} A 90 90 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
                                const midRad = ((s + e) / 2 - 90) * Math.PI / 180;
                                return (
                                    <g key={key}>
                                        <path d={d} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#000" strokeWidth="2" />
                                        {pct > 5 && (
                                            <text x={100 + 60 * Math.cos(midRad)} y={100 + 60 * Math.sin(midRad)}
                                                textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="12" fontWeight="800">
                                                {pct.toFixed(0)}%
                                            </text>
                                        )}
                                    </g>
                                );
                            });
                        })()}
                    </svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entries.map(([key, data], i) => {
                        const pct = (data.paid / totalPaid) * 100;
                        return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', border: `2px solid ${SYS.border}`, background: '#f8f8f8' }}>
                                <div style={{ width: 16, height: 16, background: PIE_COLORS[i % PIE_COLORS.length], border: `2px solid ${SYS.border}`, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{key}</div>
                                    <div style={{ fontSize: '0.7rem', color: SYS.light, fontWeight: 600 }}>{data.count} item{data.count !== 1 ? 's' : ''}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₪{fmt(data.paid)}</div>
                                    <div style={{ fontSize: '0.72rem', color: SYS.light, fontWeight: 600 }}>{pct.toFixed(1)}%</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Estimated vs Paid bars */}
            <div style={{ borderTop: `2px solid ${SYS.borderLight}`, paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: SYS.light, marginBottom: 8 }}>
                    Estimated vs Paid
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '0.72rem', fontWeight: 600, color: SYS.light }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 14, height: 10, border: `2px solid ${SYS.border}`, display: 'inline-block' }} /> Estimated
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 14, height: 10, background: SYS.primary, display: 'inline-block' }} /> Paid
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 14, height: 10, background: SYS.accent, display: 'inline-block' }} /> Over budget
                    </span>
                </div>
                {entries.map(([key, data]) => {
                    const isOver = data.estimated > 0 && data.paid > data.estimated;
                    const paidPct = maxBar > 0 ? (data.paid / maxBar) * 100 : 0;
                    const estPct = maxBar > 0 ? (data.estimated / maxBar) * 100 : 0;
                    return (
                        <div key={key} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 3 }}>{key}</div>
                            {data.estimated > 0 && (
                                <div style={{ height: 10, background: 'transparent', border: `2px solid ${SYS.border}`, width: `${estPct}%`, minWidth: 2, marginBottom: 3, boxSizing: 'border-box' }} />
                            )}
                            <div style={{ height: 10, background: isOver ? SYS.accent : SYS.primary, width: `${paidPct}%`, minWidth: 2 }} />
                            <div style={{ fontSize: '0.7rem', color: SYS.light, marginTop: 2 }}>
                                ₪{fmt(data.paid)} paid
                                {data.estimated > 0 && <> / ₪{fmt(data.estimated)} est</>}
                                {isOver && <span style={{ color: SYS.accent, fontWeight: 700 }}> ⚠ over</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(RenovationChart);
