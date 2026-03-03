import React from 'react';
import { Users } from 'lucide-react';
import { BAUHAUS, THEME } from '../../theme';
import BauhausSectionTitle from './BauhausSectionTitle';

const StatsClientSection = ({ byClient }) => {
    if (!byClient?.length) return null;
    return (
        <div style={{
            margin: `0 ${BAUHAUS.spacing.lg} ${BAUHAUS.spacing.lg}`,
            border: BAUHAUS.cardBorder, padding: BAUHAUS.spacing.lg, background: BAUHAUS.cardBg
        }}>
            <BauhausSectionTitle icon={Users}>By Client</BauhausSectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: BAUHAUS.spacing.sm }}>
                {[...byClient]
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
    );
};

export default StatsClientSection;
