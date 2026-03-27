import React from 'react';

const PRESETS = [
    { key: '30d',   label: 'Last 30 Days' },
    { key: '90d',   label: 'Last 90 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'all',   label: 'All Time' },
];

const LABEL_STYLE = {
    fontSize: '0.68rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.6px', color: '#666',
};

const INPUT_STYLE = {
    padding: '6px 10px', border: '2px solid #000',
    fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
};

const BudgetDateRangePicker = ({ dateFrom, setDateFrom, dateTo, setDateTo, datePreset, setDatePreset, applyPreset }) => (
    <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {PRESETS.map(p => (
                <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    style={{
                        padding: '7px 12px',
                        border: '2px solid #000',
                        background: datePreset === p.key ? '#0000FF' : '#fff',
                        color: datePreset === p.key ? '#fff' : '#000',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                    }}
                >
                    {p.label}
                </button>
            ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={LABEL_STYLE}>From</span>
            <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setDatePreset('custom'); }}
                style={INPUT_STYLE}
            />
            <span style={LABEL_STYLE}>To</span>
            <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setDatePreset('custom'); }}
                style={INPUT_STYLE}
            />
        </div>
    </div>
);

export default BudgetDateRangePicker;
