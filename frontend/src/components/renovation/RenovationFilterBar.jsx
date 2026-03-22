import React from 'react';
import { Search, X } from 'lucide-react';
import { SYS } from './renovationConstants';

const inputStyle = {
    padding: '6px 10px', border: '2px solid #000', fontSize: '0.85rem',
    fontFamily: 'inherit', outline: 'none', background: '#fff',
};

const RenovationFilterBar = ({
    searchTerm, setSearchTerm, statusFilter, setStatusFilter,
    areaFilter, setAreaFilter, contractorFilter, setContractorFilter,
    categoryFilter, setCategoryFilter, dateFrom, setDateFrom, dateTo, setDateTo,
    uniqueAreas, uniqueContractors, uniqueCategories, hasActiveFilters, clearFilters,
}) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12, padding: '10px 12px', border: '2px solid #000', background: '#fafafa' }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
            <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: SYS.light }} />
            <input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingLeft: 28, boxSizing: 'border-box' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
        </select>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={inputStyle}>
            <option value="">All Areas</option>
            {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={contractorFilter} onChange={e => setContractorFilter(e.target.value)} style={inputStyle}>
            <option value="">All Contractors</option>
            {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={inputStyle}>
            <option value="">All Categories</option>
            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
        {hasActiveFilters && (
            <button onClick={clearFilters} style={{
                padding: '5px 10px', border: '2px solid #000', background: '#FF0000', color: '#fff',
                cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem',
            }}>
                <X size={13} /> Clear
            </button>
        )}
    </div>
);

export default React.memo(RenovationFilterBar);
