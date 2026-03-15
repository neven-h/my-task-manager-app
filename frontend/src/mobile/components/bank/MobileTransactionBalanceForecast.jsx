import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { FONT_STACK } from '../../theme';
import useTransactionBalanceForecast from '../../../hooks/useTransactionBalanceForecast';
import {
    runwayMonths, runwayInfo, healthScore, healthLabel,
    generateInsights, applyWhatIf,
} from '../../../utils/cashflowHelpers';
import MiniChart from './MiniChart';
import HealthBadge from './HealthBadge';
import MobileWhatIfControls from './MobileWhatIfControls';
import AnomalyCard from './MobileAnomalyCard';
import MobileBalanceInput from './MobileBalanceInput';

const IOS = {
    green: '#34C759', red: '#FF3B30', blue: '#007AFF', teal: '#30B0C7',
    orange: '#FF9500', label: '#8E8E93', sep: 'rgba(0,0,0,0.08)',
    card: '#FFFFFF', bg: '#F2F2F7',
};

const fmt = (n, abs = false) => (abs ? Math.abs(n) : n)
    .toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtM = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(+y, +m - 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const MobileTransactionBalanceForecast = ({ activeTabId }) => {
    const { data, loading, startingBalance, setStartingBalance, fetchForecast } =
        useTransactionBalanceForecast(activeTabId);

    const [open, setOpen]            = useState(false);
    const [editingBal, setEditingBal] = useState(false);
    const [balInput, setBalInput]    = useState('');
    const [adjust, setAdjust]        = useState(0);

    useEffect(() => { setOpen(false); setAdjust(0); }, [activeTabId]);

    const toggle = async () => {
        if (!open && !data) await fetchForecast(3);
        setOpen(v => !v);
    };
    const saveBalance = () => {
        const v = parseFloat(balInput.replace(/[^0-9.-]/g, ''));
        if (!isNaN(v)) { setStartingBalance(v); setEditingBal(false); }
    };

    const runway   = useMemo(() => runwayMonths(startingBalance, data?.avg_monthly_spend), [startingBalance, data]);
    const rwInfo   = runwayInfo(runway);
    const score    = useMemo(() => healthScore(runway, data?.momentum, data?.anomalies?.length ?? 0), [runway, data]);
    const hlLabel  = healthLabel(score);
    const insights = useMemo(() => generateInsights(data, startingBalance), [data, startingBalance]);
    const { adjusted: adjMonthly, endBalance: adjEndBal } = useMemo(
        () => applyWhatIf(data?.predicted_monthly, startingBalance, adjust),
        [data, startingBalance, adjust]);
    const baseEndBal = useMemo(
        () => data?.predicted_monthly?.reduce((b, m) => b - m.total, startingBalance ?? 0) ?? null,
        [data, startingBalance]);

    const anomalies = data?.anomalies ?? [];

    return (
        <div style={{ padding: '8px 16px 4px', fontFamily: FONT_STACK }}>
            <div onClick={toggle} style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)',
                borderRadius: open ? '16px 16px 0 0' : 16, padding: '13px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', userSelect: 'none',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrendingUp size={18} color="#fff" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Balance Forecast</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {runway != null && (
                        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, color: '#fff' }}>
                            {rwInfo.emoji} {rwInfo.label}
                        </span>
                    )}
                    {open ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
                </div>
            </div>

            {open && (
                <div style={{ background: IOS.card, borderRadius: '0 0 16px 16px', border: `0.5px solid ${IOS.sep}`, borderTop: 'none', marginBottom: 8, overflow: 'hidden' }}>
                    <MobileBalanceInput
                        startingBalance={startingBalance} editingBal={editingBal}
                        setEditingBal={setEditingBal} balInput={balInput}
                        setBalInput={setBalInput} onSave={saveBalance}
                    />
                    {loading && <div style={{ padding: 24, textAlign: 'center', fontWeight: 600, color: IOS.teal, fontSize: '0.9rem' }}>Analysing patterns…</div>}
                    {!loading && !data && <div style={{ padding: 20, textAlign: 'center', color: IOS.label, fontSize: '0.85rem' }}>Not enough history to forecast.</div>}

                    {!loading && data && (<>
                        {startingBalance != null && (
                            <div style={{ padding: '14px 16px', background: hlLabel.bg, borderBottom: `0.5px solid ${IOS.sep}`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                                <HealthBadge score={score} label={hlLabel} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: hlLabel.color, marginBottom: 5 }}>{rwInfo.emoji} {rwInfo.label} runway</div>
                                    {insights.map((line, i) => (
                                        <div key={i} style={{ fontSize: '0.77rem', color: '#374151', fontWeight: 500, lineHeight: 1.4, marginBottom: 3 }}>{line}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <AnomalyCard anomalies={anomalies} />
                        <div style={{ display: 'flex', borderBottom: `0.5px solid ${IOS.sep}` }}>
                            {[
                                { label: 'Avg / month', val: `₪${fmt(data.avg_monthly_spend, true)}`, color: '#111' },
                                adjEndBal != null ? { label: `In ${adjMonthly.length} months`, val: `₪${fmt(adjEndBal)}`, color: adjEndBal >= 0 ? IOS.green : IOS.red } : null,
                            ].filter(Boolean).map((item, i, arr) => (
                                <div key={item.label} style={{ flex: 1, padding: '12px 16px', borderRight: i < arr.length - 1 ? `0.5px solid ${IOS.sep}` : 'none' }}>
                                    <div style={{ fontSize: '0.65rem', color: IOS.label, fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                                    <div style={{ fontWeight: 900, fontSize: '1.05rem', color: item.color }}>{item.val}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '12px 16px 4px' }}>
                            <div style={{ fontSize: '0.67rem', color: IOS.label, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                Monthly spending
                                {adjust !== 0 && <span style={{ color: adjust < 0 ? IOS.green : IOS.red }}>({adjust > 0 ? '+' : ''}{adjust}% scenario)</span>}
                            </div>
                            <MiniChart monthly_history={data.monthly_history} predicted_monthly={data.predicted_monthly} adjust={adjust} />
                        </div>
                        <MobileWhatIfControls adjust={adjust} setAdjust={setAdjust} baseEndBal={baseEndBal} adjEndBal={adjEndBal} adjMonthly={adjMonthly} />
                        {adjMonthly.length > 0 && startingBalance != null && (
                            <div style={{ borderTop: `0.5px solid ${IOS.sep}` }}>
                                <div style={{ padding: '7px 16px', background: '#f9f9f9', fontSize: '0.67rem', fontWeight: 700, color: IOS.label, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Projected balance</div>
                                {adjMonthly.map((row, i) => (
                                    <div key={row.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < adjMonthly.length - 1 ? `0.5px solid ${IOS.sep}` : 'none' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{fmtM(row.month)}</div>
                                            <div style={{ fontSize: '0.72rem', color: IOS.label, marginTop: 1 }}>−₪{fmt(row.total, true)} spending</div>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '1rem', color: row.balance >= 0 ? IOS.green : IOS.red }}>
                                            {row.balance < 0 ? '−' : ''}₪{fmt(row.balance, true)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>)}
                </div>
            )}
        </div>
    );
};

export default MobileTransactionBalanceForecast;
