import React from 'react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = {
    bg:        '#F2F2F7',
    card:      '#fff',
    separator: 'rgba(0,0,0,0.08)',
    blue:      '#007AFF',
    muted:     '#8E8E93',
    spring:    'cubic-bezier(0.22,1,0.36,1)',
};

/**
 * Scrollable pill-button tab strip for budget tabs.
 * Props: { tabs, activeTabId, setActiveTabId }
 */
const BudgetTabStrip = ({ tabs, activeTabId, setActiveTabId }) => {
    if (!tabs || tabs.length === 0) return null;

    return (
        <div style={{
            display: 'flex', overflowX: 'auto', gap: 8,
            padding: '10px 16px',
            background: IOS.card,
            borderBottom: `0.5px solid ${IOS.separator}`,
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
        }}>
            {[{ id: null, name: 'All' }, ...tabs].map(tab => {
                const isActive = activeTabId === tab.id;
                return (
                    <button key={tab.id ?? 'all'} type="button"
                        onClick={() => setActiveTabId(tab.id)}
                        style={{
                            padding: '6px 16px',
                            borderRadius: 20,
                            border: 'none',
                            background: isActive ? IOS.blue : IOS.bg,
                            color: isActive ? '#fff' : IOS.muted,
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.82rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            fontFamily: FONT_STACK,
                            flexShrink: 0,
                            transition: `all 200ms ${IOS.spring}`,
                        }}>
                        {tab.name}
                    </button>
                );
            })}
        </div>
    );
};

export { BudgetTabStrip };
export default BudgetTabStrip;
