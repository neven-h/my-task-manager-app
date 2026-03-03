import React from 'react';
import { BAUHAUS } from '../../theme';

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
        <div style={{padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: 1,
                        minWidth: '100px',
                        padding: BAUHAUS.inputPadding,
                        border: BAUHAUS.inputBorder,
                        fontSize: '0.9rem',
                        borderRadius: 0
                    }}
                />
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                        padding: BAUHAUS.inputPadding,
                        border: BAUHAUS.inputBorder,
                        fontSize: '0.9rem',
                        fontWeight: BAUHAUS.labelWeight,
                        minWidth: '100px',
                        borderRadius: 0
                    }}
                >
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                </select>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                        padding: BAUHAUS.inputPadding,
                        border: BAUHAUS.inputBorder,
                        fontSize: '0.9rem',
                        fontWeight: BAUHAUS.labelWeight,
                        minWidth: '100px',
                        borderRadius: 0
                    }}
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
