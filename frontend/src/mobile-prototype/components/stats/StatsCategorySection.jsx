import React from 'react';
import { PieChart } from 'lucide-react';
import { BAUHAUS, THEME } from '../../theme';
import PieChartSVG from './PieChartSVG';
import BauhausSectionTitle from './BauhausSectionTitle';

const StatsCategorySection = ({ byCategory, categoryChartData, pieColors }) => {
    if (!byCategory?.length) return null;
    return (
        <div style={{
            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
            border: BAUHAUS.cardBorder, padding: BAUHAUS.spacing.lg, background: BAUHAUS.cardBg
        }}>
            <BauhausSectionTitle icon={PieChart}>By Category (Top 5)</BauhausSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: BAUHAUS.spacing.md }}>
                {categoryChartData && <PieChartSVG data={categoryChartData} colors={pieColors} />}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[...byCategory]
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
                                    background: pieColors[idx % pieColors.length],
                                    border: '1px solid #000', flexShrink: 0
                                }} />
                                <span style={{ flex: 1, fontWeight: BAUHAUS.labelWeight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cat.category || 'Uncategorized'}
                                </span>
                                <span style={{ fontWeight: BAUHAUS.headingWeight }}>{cat.task_count || 0} tasks</span>
                                {cat.total_duration != null && (
                                    <span style={{ color: THEME.muted }}>{(cat.total_duration || 0).toFixed(1)}h</span>
                                )}
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};

export default StatsCategorySection;
