import React from 'react';
import CustomAutocomplete from '../../../components/CustomAutocomplete';

const IOS = {
    card: '#FFFFFF', blue: '#007AFF', muted: '#8E8E93',
    separator: 'rgba(60,60,67,0.12)',
};

const inputStyle = {
    width: '100%', padding: '11px 12px', border: `1px solid ${IOS.separator}`,
    borderRadius: 10, fontSize: '1rem', background: IOS.card, outline: 'none',
    boxSizing: 'border-box', color: '#000', fontFamily: 'inherit',
    appearance: 'none', WebkitAppearance: 'none',
};

const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 500, fontSize: '0.8rem', color: IOS.muted };

const MobileStockPortfolioFormFields = ({ formData, setFormData, stockNames }) => (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Main fields card */}
        <div style={{ background: IOS.card, borderRadius: 12, overflow: 'hidden' }}>
            {[
                {
                    label: 'Stock Name',
                    content: (
                        <CustomAutocomplete
                            value={formData.name}
                            onChange={(value) => setFormData({ ...formData, name: value })}
                            options={stockNames}
                            placeholder="Stock name…"
                        />
                    ),
                },
                {
                    label: 'Ticker Symbol',
                    content: (
                        <input type="text" value={formData.ticker_symbol}
                            onChange={(e) => setFormData({ ...formData, ticker_symbol: e.target.value })}
                            style={inputStyle} placeholder="e.g. AAPL" />
                    ),
                },
                {
                    label: 'Currency',
                    content: (
                        <select value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            style={inputStyle}>
                            <option value="USD">USD</option>
                            <option value="ILS">ILS (Israeli Shekel)</option>
                            <option value="EUR">EUR</option>
                        </select>
                    ),
                },
                {
                    label: 'Quantity (units)',
                    content: (
                        <input type="text" inputMode="decimal" value={formData.units}
                            onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                            placeholder="e.g. 1, 2.5, 100" style={inputStyle} />
                    ),
                },
                {
                    label: 'Value',
                    content: (
                        <input type="number" step="0.01" value={formData.value_ils}
                            onChange={(e) => setFormData({ ...formData, value_ils: e.target.value })}
                            style={inputStyle} />
                    ),
                },
            ].map(({ label, content }, i, arr) => (
                <div key={label} style={{ padding: '12px 14px', borderBottom: i < arr.length - 1 ? `0.5px solid ${IOS.separator}` : 'none' }}>
                    <label style={labelStyle}>{label}</label>
                    {content}
                </div>
            ))}
        </div>

        {/* Percentage + Base Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
                { label: 'Percentage', field: 'percentage', placeholder: '' },
                { label: 'Base Price (opt.)', field: 'base_price', placeholder: 'Optional' },
            ].map(({ label, field, placeholder }) => (
                <div key={field} style={{ background: IOS.card, borderRadius: 12, padding: '12px 14px' }}>
                    <label style={labelStyle}>{label}</label>
                    <input type="number" step="0.01" value={formData[field]}
                        onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                        placeholder={placeholder} style={inputStyle} />
                </div>
            ))}
        </div>

        {/* Date */}
        <div style={{ background: IOS.card, borderRadius: 12, padding: '12px 14px' }}>
            <label style={labelStyle}>Date</label>
            <input type="date" value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                style={inputStyle} />
        </div>
    </div>
);

export default MobileStockPortfolioFormFields;
