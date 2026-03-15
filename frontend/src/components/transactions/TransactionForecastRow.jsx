import React, { useState } from 'react';
import { MoreHorizontal, X, RotateCcw } from 'lucide-react';
import { humanFrequency, humanBasis, trendArrow, confidenceLabel } from '../../utils/forecastHelpers';

const fmt = (n) => Math.abs(n).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PredRow = ({ p, onDismiss, onRestore }) => {
    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const trend = trendArrow(p.trend);
    const conf = confidenceLabel(p.confidence);

    return (
        <div style={{ borderBottom: '1px dashed #e5e7eb', opacity: p._dismissed ? 0.35 : 1, textDecoration: p._dismissed ? 'line-through' : 'none', transition: 'opacity 0.2s' }}>
            <div onClick={() => !p._dismissed && setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <div style={{ width: 70, flexShrink: 0, fontWeight: 700, color: '#555', fontSize: '0.8rem' }}>
                    {new Date(p.predicted_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{p.description}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, marginTop: 2 }}>{humanBasis(p.entry_count, p.interval_days)}</div>
                </div>
                <div style={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>{humanFrequency(p.interval_days)}</div>
                <span style={{ flexShrink: 0, fontWeight: 900, fontSize: '0.9rem', color: trend.color }} title={trend.label}>{trend.symbol}</span>
                <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#dc2626', flexShrink: 0 }}>₪{fmt(p.predicted_amount)}</div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(m => !m); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af' }}>
                        {p._dismissed ? <RotateCcw size={14} /> : <MoreHorizontal size={16} />}
                    </button>
                    {menuOpen && (
                        <div style={{ position: 'absolute', right: 0, top: 24, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 160, whiteSpace: 'nowrap' }}>
                            <button onClick={(e) => { e.stopPropagation(); p._dismissed ? onRestore() : onDismiss(); setMenuOpen(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: p._dismissed ? '#16a34a' : '#dc2626', textAlign: 'left' }}>
                                {p._dismissed ? <><RotateCcw size={14} /> Restore prediction</> : <><X size={14} /> Won&#39;t happen this month</>}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {expanded && !p._dismissed && (
                <div style={{ padding: '4px 16px 10px 82px', fontSize: '0.76rem', color: '#6b7280', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: conf.color, display: 'inline-block' }} />
                        {conf.text} confidence
                    </span>
                    {p.predicted_amount_low != null && (
                        <span>Range: ₪{fmt(p.predicted_amount_low)} – ₪{fmt(p.predicted_amount_high)}</span>
                    )}
                    <span style={{ color: trend.color }}>{trend.label} trend</span>
                </div>
            )}
        </div>
    );
};

export default PredRow;
