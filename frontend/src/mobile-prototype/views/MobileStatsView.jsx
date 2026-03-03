import React, {useState, useEffect, useMemo} from 'react';
import { ArrowLeft, PieChart, Users, BarChart3, TrendingUp } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import { THEME, FONT_STACK, BAUHAUS } from '../theme';

const PIE_COLORS = BAUHAUS.pieColors;

const SectionTitle = ({ icon: Icon, children }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: BAUHAUS.spacing.md,
        paddingBottom: BAUHAUS.spacing.sm,
        borderBottom: BAUHAUS.subCardBorder
    }}>
        {Icon && <Icon size={18} color={THEME.primary} />}
        <h3 style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: BAUHAUS.labelWeight,
            textTransform: 'uppercase',
            margin: 0,
            letterSpacing: '0.5px'
        }}>
            {children}
        </h3>
    </div>
);

const StatCard = ({ label, value, bg = BAUHAUS.cardBg, color = THEME.text, sub }) => (
    <div style={{
        border: BAUHAUS.cardBorder,
        padding: BAUHAUS.spacing.lg,
        background: bg,
        textAlign: 'center'
    }}>
        <div style={{
            fontSize: BAUHAUS.labelFontSize,
            fontWeight: BAUHAUS.labelWeight,
            textTransform: 'uppercase',
            color: color === '#fff' ? 'rgba(255,255,255,0.8)' : THEME.muted,
            marginBottom: BAUHAUS.spacing.sm
        }}>
            {label}
        </div>
        <div style={{ fontSize: '1.5rem', fontWeight: BAUHAUS.headingWeight, color }}>
            {value}
        </div>
        {sub && (
            <div style={{
                fontSize: '0.75rem',
                color: color === '#fff' ? 'rgba(255,255,255,0.7)' : THEME.muted,
                marginTop: BAUHAUS.spacing.xs
            }}>
                {sub}
            </div>
        )}
    </div>
);

const PieChartSVG = ({ data, colors }) => {
    if (!data || data.length === 0) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return null;

    let currentAngle = 0;
    return (
        <svg viewBox="0 0 200 200" style={{ width: '160px', height: '160px', flexShrink: 0 }}>
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

const HorizontalBar = ({ label, value, maxValue, color, suffix = '' }) => {
    const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div style={{ marginBottom: BAUHAUS.spacing.sm }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: BAUHAUS.spacing.xs,
                fontSize: '0.75rem'
            }}>
                <span style={{ fontWeight: BAUHAUS.labelWeight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {label}
                </span>
                <span style={{ fontWeight: BAUHAUS.headingWeight, flexShrink: 0, marginLeft: '8px' }}>
                    {value}{suffix}
                </span>
            </div>
            <div style={{ height: '8px', background: BAUHAUS.cardSecondaryBg, border: '1px solid #000' }}>
                <div style={{
                    height: '100%',
                    width: `${Math.max(pct, 2)}%`,
                    background: color,
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
};

const MobileStatsView = ({authUser, authRole, onBack}) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
                if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
                const data = await response.json();
                const overall = data.overall || {};
                const totalTasks = overall.total_tasks || 0;
                const completedTasks = overall.completed_tasks || 0;
                const uncompletedTasks = overall.uncompleted_tasks || 0;
                const totalDuration = overall.total_duration || 0;
                setStats({
                    total_tasks: totalTasks,
                    done_count: completedTasks,
                    active_count: uncompletedTasks,
                    completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                    total_hours: totalDuration,
                    total_revenue: overall.total_revenue,
                    by_category: data.by_category || [],
                    by_client: data.by_client || [],
                    monthly: data.monthly || []
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [authUser, authRole]);

    const categoryChartData = useMemo(() => {
        if (!stats?.by_category?.length) return null;
        const sorted = [...stats.by_category]
            .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
            .slice(0, 5);
        return sorted.map(c => ({ label: c.category || 'Uncategorized', value: c.task_count || 0 }));
    }, [stats?.by_category]);

    const monthlyMax = useMemo(() => {
        if (!stats?.monthly?.length) return 0;
        return Math.max(...stats.monthly.map(m => m.task_count || 0), 1);
    }, [stats?.monthly]);

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK}}>
            {/* Sticky Header */}
            <div style={{
                background: '#fff',
                borderBottom: BAUHAUS.cardBorder,
                padding: BAUHAUS.spacing.lg,
                position: 'sticky',
                top: 0,
                zIndex: BAUHAUS.stickyHeaderZIndex
            }}>
                <div style={{display: 'flex', alignItems: 'center', gap: BAUHAUS.spacing.md}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: '8px', margin: '-8px', cursor: 'pointer'}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: BAUHAUS.headingFontSize, fontWeight: BAUHAUS.headingWeight, margin: 0, textTransform: 'uppercase'}}>
                        STATS
                    </h1>
                </div>
            </div>

            {loading ? (
                <div style={{textAlign: 'center', padding: '60px 16px', color: THEME.muted}}>Loading stats...</div>
            ) : !stats ? (
                <div style={{textAlign: 'center', padding: '60px 16px', color: THEME.muted}}>No stats available</div>
            ) : (
                <>
                    {/* Summary Bar — Completion Rate Hero */}
                    <div style={{
                        padding: BAUHAUS.spacing.xl,
                        background: BAUHAUS.cardSecondaryBg,
                        borderBottom: BAUHAUS.cardBorder,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted}}>
                                Completion Rate
                            </div>
                            <div style={{fontSize: '2.5rem', fontWeight: BAUHAUS.headingWeight, lineHeight: 1}}>
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{fontSize: '0.85rem', color: THEME.muted}}>
                                {stats.done_count || 0} of {stats.total_tasks || 0}
                            </div>
                            <div style={{fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted}}>
                                tasks completed
                            </div>
                        </div>
                    </div>

                    {/* Stat Cards Grid */}
                    <div style={{padding: BAUHAUS.spacing.lg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: BAUHAUS.spacing.md}}>
                        <StatCard label="Total Tasks" value={stats.total_tasks || 0} />
                        <StatCard label="Completed" value={stats.done_count || 0} />
                        <StatCard
                            label="Active"
                            value={stats.active_count || 0}
                            bg={THEME.secondary}
                        />
                        <StatCard
                            label="Total Hours"
                            value={`${(stats.total_hours || 0).toFixed(1)}h`}
                        />
                    </div>

                    {/* Revenue Card — Full Width */}
                    {stats.total_revenue !== undefined && (
                        <div style={{padding: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`}}>
                            <StatCard
                                label="Total Revenue"
                                value={`₪${(stats.total_revenue || 0).toFixed(2)}`}
                                bg={THEME.primary}
                                color="#fff"
                            />
                        </div>
                    )}

                    {/* Category Breakdown */}
                    {stats.by_category && stats.by_category.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <SectionTitle icon={PieChart}>By Category (Top 5)</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BAUHAUS.spacing.md }}>
                                {categoryChartData && (
                                    <PieChartSVG data={categoryChartData} colors={PIE_COLORS} />
                                )}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(stats.by_category || [])
                                        .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
                                        .slice(0, 5)
                                        .map((cat, idx) => (
                                            <div key={cat.category || idx} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: BAUHAUS.spacing.sm,
                                                padding: '8px 12px',
                                                border: BAUHAUS.subCardBorder,
                                                background: BAUHAUS.cardSecondaryBg,
                                                fontSize: '0.75rem'
                                            }}>
                                                <div style={{
                                                    width: '12px', height: '12px',
                                                    background: PIE_COLORS[idx % PIE_COLORS.length],
                                                    border: '1px solid #000', flexShrink: 0
                                                }} />
                                                <span style={{ flex: 1, fontWeight: BAUHAUS.labelWeight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {cat.category || 'Uncategorized'}
                                                </span>
                                                <span style={{ fontWeight: BAUHAUS.headingWeight }}>
                                                    {cat.task_count || 0} tasks
                                                </span>
                                                {cat.total_duration != null && (
                                                    <span style={{ color: THEME.muted }}>
                                                        {(cat.total_duration || 0).toFixed(1)}h
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Client Breakdown */}
                    {stats.by_client && stats.by_client.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <SectionTitle icon={Users}>By Client</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: BAUHAUS.spacing.sm }}>
                                {stats.by_client
                                    .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
                                    .map((client, idx) => (
                                        <div key={client.client || idx} style={{
                                            border: BAUHAUS.subCardBorder,
                                            padding: '12px',
                                            background: BAUHAUS.cardSecondaryBg,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: BAUHAUS.spacing.sm
                                        }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: BAUHAUS.labelWeight, fontSize: '0.85rem', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {client.client || 'No Client'}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: THEME.muted }}>
                                                    {client.task_count || 0} tasks
                                                    {client.total_duration != null && ` · ${(client.total_duration || 0).toFixed(1)}h`}
                                                </div>
                                            </div>
                                            {client.total_revenue != null && (
                                                <div style={{
                                                    fontWeight: BAUHAUS.headingWeight,
                                                    fontSize: '0.9rem',
                                                    color: THEME.primary,
                                                    flexShrink: 0
                                                }}>
                                                    ₪{(client.total_revenue || 0).toFixed(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Trends */}
                    {stats.monthly && stats.monthly.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <SectionTitle icon={BarChart3}>Monthly Trends</SectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {[...stats.monthly]
                                    .sort((a, b) => (b.month || '').localeCompare(a.month || ''))
                                    .slice(0, 6)
                                    .reverse()
                                    .map((m, idx) => {
                                        const monthStr = m.month || '';
                                        const parts = monthStr.split('-');
                                        const label = parts.length >= 2
                                            ? new Date(Number(parts[0]), Number(parts[1]) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                                            : monthStr;
                                        return (
                                            <HorizontalBar
                                                key={monthStr || idx}
                                                label={label}
                                                value={m.task_count || 0}
                                                maxValue={monthlyMax}
                                                color={PIE_COLORS[idx % PIE_COLORS.length]}
                                                suffix=" tasks"
                                            />
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Bottom Spacer */}
                    <div style={{ height: '32px' }} />
                </>
            )}
        </div>
    );
};

export default MobileStatsView;
