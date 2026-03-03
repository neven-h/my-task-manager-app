import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, PieChart, Users, BarChart3 } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import { THEME, FONT_STACK, BAUHAUS } from '../theme';

import StatCard from '../components/stats/StatCard';
import PieChartSVG from '../components/stats/PieChartSVG';
import HorizontalBar from '../components/stats/HorizontalBar';
import BauhausSectionTitle from '../components/stats/BauhausSectionTitle';
import ExpandableTaskBreakdown from '../../components/tasks/ExpandableTaskBreakdown';

const PIE_COLORS = BAUHAUS.pieColors;

const MobileStatsView = ({ authUser, authRole, onBack }) => {
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tasksRes] = await Promise.all([
                    fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() }),
                    fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders() })
                ]);

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    const overall = data.overall || {};
                    const totalTasks = overall.total_tasks || 0;
                    const completedTasks = overall.completed_tasks || 0;
                    setStats({
                        total_tasks: totalTasks,
                        done_count: completedTasks,
                        active_count: overall.uncompleted_tasks || 0,
                        completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                        total_hours: overall.total_duration || 0,
                        total_revenue: overall.total_revenue,
                        by_category: data.by_category || [],
                        by_client: data.by_client || [],
                        monthly: data.monthly || []
                    });
                }

                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
            {/* Sticky Header — with safe-area-inset-top support */}
            <div style={{
                background: '#fff',
                borderBottom: BAUHAUS.cardBorder,
                padding: `max(${BAUHAUS.spacing.lg}, env(safe-area-inset-top)) ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                position: 'sticky',
                top: 0,
                zIndex: BAUHAUS.stickyHeaderZIndex
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: BAUHAUS.spacing.md }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', padding: '8px', margin: '-8px', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: BAUHAUS.headingFontSize, fontWeight: BAUHAUS.headingWeight, margin: 0, textTransform: 'uppercase' }}>
                        STATS
                    </h1>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: THEME.muted }}>Loading stats...</div>
            ) : !stats ? (
                <div style={{ textAlign: 'center', padding: '60px 16px', color: THEME.muted }}>No stats available</div>
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
                            <div style={{ fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted }}>
                                Completion Rate
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: BAUHAUS.headingWeight, lineHeight: 1 }}>
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: THEME.muted }}>
                                {stats.done_count || 0} of {stats.total_tasks || 0}
                            </div>
                            <div style={{ fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted }}>
                                tasks completed
                            </div>
                        </div>
                    </div>

                    {/* Stat Cards Grid */}
                    <div style={{ padding: BAUHAUS.spacing.lg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: BAUHAUS.spacing.md }}>
                        <StatCard label="Total Tasks" value={stats.total_tasks || 0} />
                        <StatCard label="Completed" value={stats.done_count || 0} />
                        <StatCard label="Active" value={stats.active_count || 0} bg={THEME.secondary} />
                        <StatCard label="Total Hours" value={`${(stats.total_hours || 0).toFixed(1)}h`} />
                    </div>

                    {/* Revenue Card — Full Width */}
                    {stats.total_revenue !== undefined && (
                        <div style={{ padding: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}` }}>
                            <StatCard
                                label="Total Revenue"
                                value={`₪${(stats.total_revenue || 0).toFixed(2)}`}
                                bg={THEME.primary}
                                color="#fff"
                            />
                        </div>
                    )}

                    {/* Category Breakdown */}
                    {stats.by_category?.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <BauhausSectionTitle icon={PieChart}>By Category (Top 5)</BauhausSectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BAUHAUS.spacing.md }}>
                                {categoryChartData && <PieChartSVG data={categoryChartData} colors={PIE_COLORS} />}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {stats.by_category
                                        .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
                                        .slice(0, 5)
                                        .map((cat, idx) => (
                                            <div key={cat.category || idx} style={{
                                                display: 'flex', alignItems: 'center', gap: BAUHAUS.spacing.sm,
                                                padding: '8px 12px', border: BAUHAUS.subCardBorder,
                                                background: BAUHAUS.cardSecondaryBg, fontSize: '0.75rem'
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
                    {stats.by_client?.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <BauhausSectionTitle icon={Users}>By Client</BauhausSectionTitle>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: BAUHAUS.spacing.sm }}>
                                {stats.by_client
                                    .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
                                    .map((client, idx) => (
                                        <div key={client.client || idx} style={{
                                            border: BAUHAUS.subCardBorder, padding: '12px',
                                            background: BAUHAUS.cardSecondaryBg,
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', gap: BAUHAUS.spacing.sm
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
                                                <div style={{ fontWeight: BAUHAUS.headingWeight, fontSize: '0.9rem', color: THEME.primary, flexShrink: 0 }}>
                                                    ₪{(client.total_revenue || 0).toFixed(0)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Monthly Trends */}
                    {stats.monthly?.length > 0 && (
                        <div style={{
                            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                            border: BAUHAUS.cardBorder,
                            padding: BAUHAUS.spacing.lg,
                            background: BAUHAUS.cardBg
                        }}>
                            <BauhausSectionTitle icon={BarChart3}>Monthly Trends</BauhausSectionTitle>
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

                    {/* Task Breakdown — expandable active/completed lists */}
                    {tasks.length > 0 && (
                        <div style={{ padding: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}` }}>
                            <ExpandableTaskBreakdown
                                tasks={tasks}
                                activeCount={stats.active_count}
                                completedCount={stats.done_count}
                                totalCount={stats.total_tasks}
                                variant="mobile"
                            />
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
