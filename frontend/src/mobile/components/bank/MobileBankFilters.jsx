import React, { useState } from 'react';
import { SlidersHorizontal, CheckSquare } from 'lucide-react';

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

const LABEL = { fontSize: '0.72rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 2 };

const MobileBankFilters = ({
    searchTerm, setSearchTerm,
    typeFilter, setTypeFilter,
    selectedMonth, setSelectedMonth,
    availableMonths, formatMonthYear,
    dateFrom, setDateFrom, dateTo, setDateTo,
    amountMin, setAmountMin, amountMax, setAmountMax,
    selectMode, onToggleSelectMode,
}) => {
    const [showMore, setShowMore] = useState(false);
    const hasActiveFilters = dateFrom || dateTo || amountMin || amountMax;

    return (
        <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="text" placeholder="Search transactions…" value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ ...IOS_INPUT, flex: 1 }}>
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                </select>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ ...IOS_INPUT, flex: 1 }} title="Month">
                    <option value="all">All months</option>
                    {[...availableMonths].sort((a, b) => b.localeCompare(a)).map(m => (
                        <option key={m} value={m}>{formatMonthYear(m)}</option>
                    ))}
                </select>
            </div>

            {/* Action row: More Filters + Select toggle */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowMore(!showMore)} style={{
                    ...IOS_INPUT, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, fontWeight: 600, fontSize: '0.8rem', color: hasActiveFilters ? '#007AFF' : '#666',
                    cursor: 'pointer',
                }}>
                    <SlidersHorizontal size={14} />
                    {showMore ? 'Less' : 'More'} Filters{hasActiveFilters ? ' ●' : ''}
                </button>
                <button onClick={onToggleSelectMode} style={{
                    ...IOS_INPUT, width: 'auto', display: 'flex', alignItems: 'center', gap: 6,
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                    color: selectMode ? '#007AFF' : '#666',
                    background: selectMode ? 'rgba(0,122,255,0.12)' : IOS_INPUT.background,
                }}>
                    <CheckSquare size={14} /> Select
                </button>
            </div>

            {showMore && (
                <>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={LABEL}>From</div>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={LABEL}>To</div>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={LABEL}>Min ₪</div>
                            <input type="number" step="0.01" placeholder="0" value={amountMin}
                                onChange={e => setAmountMin(e.target.value)}
                                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={LABEL}>Max ₪</div>
                            <input type="number" step="0.01" placeholder="∞" value={amountMax}
                                onChange={e => setAmountMax(e.target.value)}
                                style={{ ...IOS_INPUT, width: '100%', boxSizing: 'border-box' }} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MobileBankFilters;
