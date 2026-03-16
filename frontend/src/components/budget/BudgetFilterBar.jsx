import React from 'react';
import { Search, X } from 'lucide-react';

const SYS = { border: '#000', light: '#666', accent: '#FF0000' };

const inputStyle = {
    padding: '6px 10px', border: `2px solid ${SYS.border}`,
    fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
};

const BudgetFilterBar = ({
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    amountMin, setAmountMin, amountMax, setAmountMax,
    clearFilters, hasActiveFilters, allCategories,
}) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16, padding: '10px 12px', border: `2px solid ${SYS.border}`, background: '#fafafa' }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: SYS.light }} />
            <input placeholder="Search description..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: 28 }} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 150px', background: '#fff' }}>
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" placeholder="Min ₪" value={amountMin} onChange={e => setAmountMin(e.target.value)}
            style={{ ...inputStyle, width: 80 }} />
        <input type="number" placeholder="Max ₪" value={amountMax} onChange={e => setAmountMax(e.target.value)}
            style={{ ...inputStyle, width: 80 }} />
        {hasActiveFilters && (
            <button onClick={clearFilters} title="Clear filters"
                style={{ padding: '5px 10px', border: `2px solid ${SYS.border}`, background: SYS.accent, color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                <X size={13} /> Clear
            </button>
        )}
    </div>
);

export default React.memo(BudgetFilterBar);
