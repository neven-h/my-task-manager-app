import React, { memo, useState, useMemo } from 'react';
import { Zap, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';
import {
    activePredictions, trendArrow, humanFrequency,
    loadDismissed, saveDismissed, emptyStateMessage,
} from '../../../utils/forecastHelpers';

const IOS = {
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    green:     '#34C759',
    red:       '#FF3B30',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    bg:        '#F2F2F7',
    radius:    16,
};

const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

const BUDGET_FORECAST_KEY = 'budget';

// Build 3–5 insight cards from active predictions
function buildInsights(active) {
    const insights = [];
    const expenses  = active.filter(p => p.type === 'outcome');
    const incomes   = active.filter(p => p.type === 'income');
    const fixed     = expenses.filter(p => p.confidence >= 0.7);
    const variable  = expenses.filter(p => p.confidence < 0.7);

    // 1. Recurring fixed costs
    if (fixed.length > 0) {
        const monthlyEst = fixed.reduce((s, p) =>
            s + p.predicted_amount * 30 / Math.max(p.interval_days || 30, 1), 0);
        insights.push({
            key: 'fixed',
            color: IOS.red,
            icon: '■',
            label: `${fixed.length} recurring cost${fixed.length !== 1 ? 's' : ''}`,
            value: `~${fmt(monthlyEst)}/month`,
            items: fixed,
        });
    }

    // 2. Income sources
    if (incomes.length > 0) {
        const total3m = incomes.reduce((s, p) => s + p.predicted_amount, 0);
        insights.push({
            key: 'income',
            color: IOS.green,
            icon: '●',
            label: `${incomes.length} income source${incomes.length !== 1 ? 's' : ''} expected`,
            value: `+${fmt(total3m)} over 3 months`,
            items: incomes,
        });
    }

    // 3. Trending-up warning (most impactful first)
    const trendingUp = expenses
        .filter(p => p.trend === 'up')
        .sort((a, b) => b.predicted_amount - a.predicted_amount);
    if (trendingUp.length > 0) {
        const top = trendingUp[0];
        insights.push({
            key: 'trending',
            color: IOS.red,
            icon: '↑',
            label: trendingUp.length === 1
                ? `${top.description} is growing`
                : `${trendingUp.length} expenses are trending up`,
            value: trendingUp.length === 1
                ? `${humanFrequency(top.interval_days)} · −${fmt(top.predicted_amount)}`
                : `${top.description} and ${trendingUp.length - 1} more`,
            items: trendingUp,
        });
    }

    // 4. Variable / uncertain costs (if any and not already covered by trending)
    const uncoveredVariable = variable.filter(p => p.trend !== 'up');
    if (uncoveredVariable.length > 0) {
        const total = uncoveredVariable.reduce((s, p) => s + p.predicted_amount, 0);
        insights.push({
            key: 'variable',
            color: IOS.blue,
            icon: '▲',
            label: `${uncoveredVariable.length} variable cost${uncoveredVariable.length !== 1 ? 's' : ''}`,
            value: `~${fmt(total)} estimated`,
            items: uncoveredVariable,
        });
    }

    return insights;
}

// Expanded detail row (inside an insight card)
const DetailRow = memo(({ p, onDismiss, onRestore, isLast }) => {
    const [showDetail, setShowDetail] = useState(false);
    const isIncome = p.type === 'income';
    const color = isIncome ? IOS.green : IOS.red;
    const trend = trendArrow(p.trend);

    return (
        <div style={{ opacity: p._dismissed ? 0.38 : 1, transition: 'opacity 0.2s' }}>
            <div
                onClick={() => !p._dismissed && setShowDetail(v => !v)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}`,
                    cursor: 'pointer',
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '0.82rem', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textDecoration: p._dismissed ? 'line-through' : 'none',
                    }}>
                        {p.description}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: IOS.muted, marginTop: 1 }}>
                        {humanFrequency(p.interval_days)}
                        {p.trend !== 'stable' && (
                            <span style={{ color: trend.color, marginLeft: 6 }}>{trend.symbol} {trend.label}</span>
                        )}
                    </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color, flexShrink: 0 }}>
                    {isIncome ? '+' : '−'}{fmt(p.predicted_amount)}
                </div>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); p._dismissed ? onRestore(p._idx) : onDismiss(p._idx); }}
                    title={p._dismissed ? 'Restore' : "Won't happen"}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: IOS.muted, flexShrink: 0 }}
                >
                    {p._dismissed ? <RotateCcw size={12} /> : <X size={12} />}
                </button>
            </div>
            {showDetail && !p._dismissed && (
                <div style={{ fontSize: '0.7rem', color: IOS.muted, padding: '2px 0 8px 0' }}>
                    Based on {p.entry_count} transactions · {humanFrequency(p.interval_days)} pattern
                    {p.predicted_amount_low != null && (
                        <span> · Range: {fmt(p.predicted_amount_low)}–{fmt(p.predicted_amount_high)}</span>
                    )}
                </div>
            )}
        </div>
    );
});

// One insight summary card
const InsightCard = ({ insight, expanded, onToggle, onDismiss, onRestore, isLast }) => (
    <div style={{ borderBottom: isLast ? 'none' : `0.5px solid ${IOS.separator}` }}>
        <div
            onClick={onToggle}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', cursor: 'pointer',
            }}
        >
            <span style={{ color: insight.color, fontWeight: 800, fontSize: '1rem', flexShrink: 0, width: 16, textAlign: 'center' }}>
                {insight.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1c1c1e' }}>{insight.label}</div>
                <div style={{ fontSize: '0.75rem', color: IOS.muted, marginTop: 2 }}>{insight.value}</div>
            </div>
            <div style={{ color: IOS.muted, flexShrink: 0 }}>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
        </div>

        {expanded && (
            <div style={{ padding: '0 16px 10px 44px', background: IOS.bg }}>
                {insight.items.map((p, i) => (
                    <DetailRow
                        key={p._idx}
                        p={p}
                        onDismiss={onDismiss}
                        onRestore={onRestore}
                        isLast={i === insight.items.length - 1}
                    />
                ))}
            </div>
        )}
    </div>
);

const ForecastSection = ({ predictions, onFetch, loading }) => {
    const [open, setOpen]           = useState(false);
    const [expanded, setExpanded]   = useState(null); // insight key
    const [dismissed, setDismissed] = useState(() => loadDismissed(BUDGET_FORECAST_KEY));

    const handleToggle = () => {
        if (!open && predictions.length === 0) onFetch();
        setOpen(o => !o);
    };

    const dismiss = (idx) => setDismissed(prev => {
        const s = new Set(prev).add(idx); saveDismissed(BUDGET_FORECAST_KEY, s); return s;
    });
    const restore = (idx) => setDismissed(prev => {
        const s = new Set(prev); s.delete(idx); saveDismissed(BUDGET_FORECAST_KEY, s); return s;
    });

    // Cap to top 15 most confident predictions
    const capped = useMemo(() =>
        predictions.length > 15
            ? [...predictions].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 15)
            : predictions,
        [predictions]);

    const active = useMemo(() => activePredictions(capped, dismissed), [capped, dismissed]);

    const totalIncome  = active.filter(p => p.type === 'income' ).reduce((s, p) => s + p.predicted_amount, 0);
    const totalExpense = active.filter(p => p.type === 'outcome').reduce((s, p) => s + p.predicted_amount, 0);
    const projectedNet = totalIncome - totalExpense;

    // Tag each active prediction with its original index (for dismiss)
    const taggedActive = useMemo(() =>
        capped.map((p, idx) => ({ ...p, _idx: idx, _dismissed: dismissed.has(idx) })),
        [capped, dismissed]);

    const insights = useMemo(() => buildInsights(taggedActive), [taggedActive]);

    return (
        <div style={{ margin: '16px 16px 0' }}>
            <button type="button" onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '13px 16px',
                    border: 'none', borderRadius: IOS.radius,
                    background: open ? '#0000FF' : IOS.card,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    fontFamily: FONT_STACK, color: open ? '#fff' : '#000',
                }}>
                <Zap size={16} />
                {open ? 'Hide' : 'Show'} AI Forecast
                {predictions.length > 0 && (
                    <span style={{
                        background: open ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                        color: open ? '#fff' : '#0000FF',
                        borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                        {insights.length}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    background: IOS.card, borderRadius: IOS.radius,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.07)', marginTop: 8, overflow: 'hidden',
                }}>
                    {loading && predictions.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            Analyzing patterns…
                        </div>
                    ) : predictions.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: IOS.muted, fontSize: '0.85rem' }}>
                            {emptyStateMessage(false)}
                        </div>
                    ) : (
                        <>
                            {/* 3-month projection summary */}
                            <div style={{
                                display: 'flex', gap: 0,
                                borderBottom: `0.5px solid ${IOS.separator}`,
                            }}>
                                {[
                                    { label: 'Income',   value: `+${fmt(totalIncome)}`,  color: IOS.green },
                                    { label: 'Expenses', value: `−${fmt(totalExpense)}`, color: IOS.red },
                                    { label: 'Net',      value: `${projectedNet >= 0 ? '+' : '−'}${fmt(projectedNet)}`, color: projectedNet >= 0 ? IOS.blue : IOS.red },
                                ].map((item, i) => (
                                    <div key={item.label} style={{
                                        flex: 1, padding: '10px 0', textAlign: 'center',
                                        borderRight: i < 2 ? `0.5px solid ${IOS.separator}` : 'none',
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: IOS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {item.label}
                                        </div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color, marginTop: 2 }}>
                                            {item.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '4px 16px 2px', fontSize: '0.65rem', color: IOS.muted, textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 600 }}>
                                3-month projection
                            </div>

                            {/* Insight cards */}
                            {insights.map((insight, i) => (
                                <InsightCard
                                    key={insight.key}
                                    insight={insight}
                                    expanded={expanded === insight.key}
                                    onToggle={() => setExpanded(k => k === insight.key ? null : insight.key)}
                                    onDismiss={dismiss}
                                    onRestore={restore}
                                    isLast={i === insights.length - 1}
                                />
                            ))}
                            {dismissed.size > 0 && (
                                <div style={{ padding: '8px 16px', fontSize: '0.72rem', color: IOS.muted, borderTop: `0.5px solid ${IOS.separator}` }}>
                                    {dismissed.size} prediction{dismissed.size !== 1 ? 's' : ''} dismissed — tap ✕ to restore
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ForecastSection;
