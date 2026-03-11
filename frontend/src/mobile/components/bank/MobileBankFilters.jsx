import React from 'react';

const IOS_INPUT = {
    background: 'rgba(120,120,128,0.12)',
    border: 'none',
    borderRadius: '10px',
    padding: '9px 12px',
    fontSize: '0.9rem',
    color: '#000',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
};

const MobileBankFilters = ({
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    formatMonthYear
}) => {
    return (
        <div style={{padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <input
                type="text"
                placeholder="Search transactions…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }}
            />
            <div style={{display: 'flex', gap: '8px'}}>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ ...IOS_INPUT, flex: 1 }}
                >
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                </select>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ ...IOS_INPUT, flex: 1 }}
                    title="Month"
                >
                    <option value="all">All months</option>
                    {[...availableMonths].sort((a, b) => b.localeCompare(a)).map(m => (
                        <option key={m} value={m}>{formatMonthYear(m)}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default MobileBankFilters;
