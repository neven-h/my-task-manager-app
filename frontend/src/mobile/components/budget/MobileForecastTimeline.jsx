import React from 'react';
import HistoryRow from './MobileHistoryRow';
import PredRow from './MobilePredRow';

const IOS = { separator: 'rgba(0,0,0,0.08)', muted: '#8E8E93' };

const fmt = (n) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const MobileForecastTimeline = ({ hist, tl, visHist, hiddenHistCount, showAllHist, setShowAllHist, forecast }) => (
    <>
        {/* ── History ── */}
        {hist.length > 0 && (<>
            <div style={{ padding: '6px 16px', background: '#eff6ff', borderBottom: '0.5px solid #dbeafe', fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Historical (actual)</span>
                {!showAllHist && hiddenHistCount > 0 && (
                    <button type="button" onClick={() => setShowAllHist(true)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                        +{hiddenHistCount} more
                    </button>
                )}
                {showAllHist && hiddenHistCount > 0 && (
                    <button type="button" onClick={() => setShowAllHist(false)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                        Show less
                    </button>
                )}
            </div>
            {visHist.map((m, i) => (
                <HistoryRow key={m.month} m={m} isLast={i === visHist.length - 1} />
            ))}
        </>)}

        {/* ── TODAY divider ── */}
        {(hist.length > 0 || tl.length > 0) && (
            <div style={{ padding: '8px 16px', background: '#fef9c3', borderTop: '0.5px solid #fde68a', borderBottom: '0.5px solid #fde68a', fontSize: '0.72rem', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>&#9654; Today</span>
                <span style={{ fontWeight: 500 }}>{'\u20AA'}{fmt(forecast.current_balance)}</span>
            </div>
        )}

        {/* ── Individual predictions ── */}
        {tl.length > 0 && (<>
            <div style={{ padding: '6px 16px', background: '#f9fafb', borderBottom: `0.5px solid ${IOS.separator}`, fontSize: '0.65rem', fontWeight: 700, color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Upcoming &middot; {tl.length} items
            </div>
            {tl.map((p, idx) => (
                <PredRow key={idx} p={p} isLast={idx === tl.length - 1} />
            ))}
        </>)}

        {tl.length === 0 && hist.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                No data yet — add budget entries and link a bank tab.
            </div>
        )}
    </>
);

export default MobileForecastTimeline;
