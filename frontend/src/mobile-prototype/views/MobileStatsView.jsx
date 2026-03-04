import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { THEME, FONT_STACK, BAUHAUS } from '../theme';
import useMobileStats from '../hooks/useMobileStats';
import StatCard from '../components/stats/StatCard';
import StatsCategorySection from '../components/stats/StatsCategorySection';
import StatsClientSection from '../components/stats/StatsClientSection';
import StatsMonthlySection from '../components/stats/StatsMonthlySection';
import ExpandableTaskBreakdown from '../../components/tasks/ExpandableTaskBreakdown';

const MobileStatsView = ({ authUser, authRole, onBack }) => {
    const { stats, tasks, loading, categoryChartData, monthlyMax, PIE_COLORS } = useMobileStats(authUser, authRole);

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT_STACK }}>
            <div style={{
                background: '#fff', borderBottom: BAUHAUS.cardBorder,
                padding: `max(${BAUHAUS.spacing.lg}, env(safe-area-inset-top)) ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
                position: 'sticky', top: 0, zIndex: BAUHAUS.stickyHeaderZIndex
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: BAUHAUS.spacing.md }}>
                    <button
  onClick={onBack}
  style={{
    background: 'none',
    border: 'none',
    padding: '12px',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }}
>
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
                    <div style={{
                        padding: BAUHAUS.spacing.xl, background: BAUHAUS.cardSecondaryBg,
                        borderBottom: BAUHAUS.cardBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted }}>Completion Rate</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: BAUHAUS.headingWeight, lineHeight: 1 }}>
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.85rem', color: THEME.muted }}>{stats.done_count || 0} of {stats.total_tasks || 0}</div>
                            <div style={{ fontSize: BAUHAUS.labelFontSize, fontWeight: BAUHAUS.labelWeight, textTransform: 'uppercase', color: THEME.muted }}>tasks completed</div>
                        </div>
                    </div>

                    <div style={{ padding: BAUHAUS.spacing.lg, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: BAUHAUS.spacing.md }}>
                        <StatCard label="Total Tasks" value={stats.total_tasks || 0} />
                        <StatCard label="Completed" value={stats.done_count || 0} />
                        <StatCard label="Active" value={stats.active_count || 0} bg={THEME.secondary} />
                        <StatCard label="Total Hours" value={`${(stats.total_hours || 0).toFixed(1)}h`} />
                    </div>

                    {stats.total_revenue !== undefined && (
                        <div style={{ padding: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}` }}>
                            <StatCard label="Total Revenue" value={`₪${(stats.total_revenue || 0).toFixed(2)}`} bg={THEME.primary} color="#fff" />
                        </div>
                    )}

                    <StatsCategorySection byCategory={stats.by_category} categoryChartData={categoryChartData} pieColors={PIE_COLORS} />
                    <StatsClientSection byClient={stats.by_client} />
                    <StatsMonthlySection monthly={stats.monthly} monthlyMax={monthlyMax} pieColors={PIE_COLORS} />

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

                    <div style={{ height: '32px' }} />
                </>
            )}
        </div>
    );
};

export default MobileStatsView;
