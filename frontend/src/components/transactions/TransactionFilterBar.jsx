import React from 'react';
import { Edit3 } from 'lucide-react';
import { useBankTransactionContext } from '../../context/BankTransactionContext';

const LABEL = { display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.3px' };
const INPUT = (c) => ({ width: '100%', padding: '0.65rem', border: `2px solid ${c.border}`, fontSize: '0.9rem', fontFamily: '"Inter", sans-serif' });

const TransactionFilterBar = () => {
    const {
        colors,
        typeFilter, setTypeFilter,
        searchTerm, setSearchTerm,
        descriptionFilter, setDescriptionFilter,
        dateFrom, setDateFrom, dateTo, setDateTo,
        amountMin, setAmountMin, amountMax, setAmountMax,
        allDescriptions, handleBatchRename,
    } = useBankTransactionContext();

    const onRename = () => {
        const newName = window.prompt(`Rename "${descriptionFilter}" to:`, descriptionFilter);
        if (newName && newName.trim() && newName.trim() !== descriptionFilter) {
            handleBatchRename(descriptionFilter, newName.trim());
        }
    };

    return (
        <div style={{
            display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap',
            padding: '1rem', background: '#f8f8f8', border: `2px solid ${colors.border}`
        }}>
            <div style={{ flex: 1, minWidth: '140px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Type</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={INPUT(colors)}>
                    <option value="all">All Types</option>
                    <option value="credit">Credit Only</option>
                    <option value="cash">Cash Only</option>
                </select>
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Search</label>
                <input type="text" placeholder="Search descriptions..." value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)} style={INPUT(colors)} />
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Category</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={descriptionFilter} onChange={e => setDescriptionFilter(e.target.value)}
                        style={{ ...INPUT(colors), flex: 1 }}>
                        <option value="">All Categories</option>
                        {allDescriptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {descriptionFilter && (
                        <button onClick={onRename} title="Rename all with this description" style={{
                            padding: '0.65rem', border: `2px solid ${colors.border}`, background: colors.secondary,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
                        }}>
                            <Edit3 size={16} />
                        </button>
                    )}
                </div>
            </div>
            <div style={{ flex: 1, minWidth: '130px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Date From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={INPUT(colors)} />
            </div>
            <div style={{ flex: 1, minWidth: '130px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Date To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={INPUT(colors)} />
            </div>
            <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Min ₪</label>
                <input type="number" step="0.01" placeholder="0" value={amountMin}
                    onChange={e => setAmountMin(e.target.value)} style={INPUT(colors)} />
            </div>
            <div style={{ flex: 1, minWidth: '110px' }}>
                <label style={{ ...LABEL, color: colors.text }}>Max ₪</label>
                <input type="number" step="0.01" placeholder="∞" value={amountMax}
                    onChange={e => setAmountMax(e.target.value)} style={INPUT(colors)} />
            </div>
        </div>
    );
};

export default TransactionFilterBar;
