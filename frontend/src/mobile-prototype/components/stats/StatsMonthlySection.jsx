import React from 'react';
import { BarChart3 } from 'lucide-react';
import { BAUHAUS } from '../../theme';
import HorizontalBar from './HorizontalBar';
import BauhausSectionTitle from './BauhausSectionTitle';

const StatsMonthlySection = ({ monthly, monthlyMax, pieColors }) => {
    if (!monthly?.length) return null;
    return (
        <div style={{
            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
            border: BAUHAUS.cardBorder, padding: BAUHAUS.spacing.lg, background: BAUHAUS.cardBg
        }}>
            <BauhausSectionTitle icon={BarChart3}>Monthly Trends</BauhausSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...monthly]
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
                                color={pieColors[idx % pieColors.length]}
                                suffix=" tasks"
                            />
                        );
                    })}
            </div>
        </div>
    );
};

export default StatsMonthlySection;
