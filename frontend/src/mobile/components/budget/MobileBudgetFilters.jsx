import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';

const IOS = { bg: '#F2F2F7', card: '#fff', blue: '#007AFF', red: '#FF3B30', muted: '#8E8E93', radius: 12 };

const pill = {
    padding: '8px 12px', border: 'none', borderRadius: 10, fontSize: '16px',
    fontWeight: 600, fontFamily: FONT_STACK, background: IOS.bg,
};

const MobileBudgetFilters = ({
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    amountMin, setAmountMin, amountMax, setAmountMax,
    clearFilters, hasActiveFilters, allCategories,
}) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ margin: '0 16px 10px', fontFamily: FONT_STACK }}>
            {/* Search row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={15} color={IOS.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        style={{ ...pill, width: '100%', paddingLeft: 32, background: IOS.card, boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => setExpanded(p => !p)}
                    style={{ ...pill, background: expanded || hasActiveFilters ? IOS.blue : IOS.card, color: expanded || hasActiveFilters ? '#fff' : '#000', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <SlidersHorizontal size={14} /> Filters
                </button>
            </div>

            {/* Expandable filters */}
            {expanded && (
                <div style={{ marginTop: 8, padding: 12, background: IOS.card, borderRadius: IOS.radius, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                        style={{ ...pill, width: '100%' }}>
                        <option value="">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input type="number" placeholder="Min ₪" value={amountMin} onChange={e => setAmountMin(e.target.value)}
                            style={{ ...pill, flex: 1, width: '100%' }} />
                        <input type="number" placeholder="Max ₪" value={amountMax} onChange={e => setAmountMax(e.target.value)}
                            style={{ ...pill, flex: 1, width: '100%' }} />
                    </div>
                    {hasActiveFilters && (
                        <button onClick={clearFilters}
                            style={{ ...pill, background: IOS.red, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <X size={13} /> Clear Filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(MobileBudgetFilters);
