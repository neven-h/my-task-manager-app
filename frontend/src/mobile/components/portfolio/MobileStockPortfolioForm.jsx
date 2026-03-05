import React, { useState, useEffect } from 'react';
import CustomAutocomplete from '../../../components/CustomAutocomplete';

const IOS = {
    bg: '#F2F2F7',
    card: '#FFFFFF',
    blue: '#007AFF',
    muted: '#8E8E93',
    separator: 'rgba(60,60,67,0.12)',
    spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    border: `1px solid ${IOS.separator}`,
    borderRadius: 10,
    fontSize: '1rem',
    background: IOS.card,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#000',
    fontFamily: 'inherit',
    appearance: 'none',
    WebkitAppearance: 'none',
};

const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 500,
    fontSize: '0.8rem',
    color: IOS.muted,
};

const MobileStockPortfolioForm = ({
    showForm,
    editingEntry,
    formData,
    setFormData,
    stockNames,
    loading,
    onClose,
    onSave,
    theme,  // kept for API compatibility
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (showForm) {
            requestAnimationFrame(() => setMounted(true));
        } else {
            setMounted(false);
        }
    }, [showForm]);

    if (!showForm) return null;

    const canSave = !loading && formData.name && formData.value_ils;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: `rgba(0,0,0,${mounted ? 0.4 : 0})`,
                zIndex: 200,
                display: 'flex',
                alignItems: 'flex-end',
                touchAction: 'none',
                overscrollBehavior: 'contain',
                transition: `background 300ms ${IOS.spring}`,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
            <div
                style={{
                    width: '100%',
                    maxHeight: '92vh',
                    background: IOS.bg,
                    borderRadius: '20px 20px 0 0',
                    paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: mounted ? 'translateY(0)' : 'translateY(100%)',
                    transition: `transform 380ms ${IOS.spring}`,
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                {/* Pull handle */}
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '2px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(60,60,67,0.18)' }} />
                </div>

                {/* iOS nav bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 80px',
                    alignItems: 'center',
                    padding: '6px 16px 12px',
                    flexShrink: 0,
                    borderBottom: `0.5px solid ${IOS.separator}`,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: IOS.blue, fontSize: '1rem', textAlign: 'left', padding: '6px 0',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <span style={{ textAlign: 'center', fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.2px' }}>
                        {editingEntry ? 'Edit Entry' : 'New Entry'}
                    </span>
                    <button
                        onClick={onSave}
                        disabled={!canSave}
                        style={{
                            background: 'none', border: 'none', cursor: canSave ? 'pointer' : 'default',
                            color: canSave ? IOS.blue : IOS.muted,
                            fontSize: '1rem', fontWeight: 600, textAlign: 'right', padding: '6px 0',
                            fontFamily: 'inherit',
                        }}
                    >
                        {loading ? 'Saving…' : 'Save'}
                    </button>
                </div>

                {/* Form body */}
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
                                    <input
                                        type="text"
                                        value={formData.ticker_symbol}
                                        onChange={(e) => setFormData({ ...formData, ticker_symbol: e.target.value })}
                                        style={inputStyle}
                                        placeholder="e.g. AAPL"
                                    />
                                ),
                            },
                            {
                                label: 'Currency',
                                content: (
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        style={inputStyle}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="ILS">ILS (Israeli Shekel)</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                ),
                            },
                            {
                                label: 'Quantity (units)',
                                content: (
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formData.units}
                                        onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                                        placeholder="e.g. 1, 2.5, 100"
                                        style={inputStyle}
                                    />
                                ),
                            },
                            {
                                label: 'Value',
                                content: (
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.value_ils}
                                        onChange={(e) => setFormData({ ...formData, value_ils: e.target.value })}
                                        style={inputStyle}
                                    />
                                ),
                            },
                        ].map(({ label, content }, i, arr) => (
                            <div
                                key={label}
                                style={{
                                    padding: '12px 14px',
                                    borderBottom: i < arr.length - 1 ? `0.5px solid ${IOS.separator}` : 'none',
                                }}
                            >
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
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData[field]}
                                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                    placeholder={placeholder}
                                    style={inputStyle}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Date */}
                    <div style={{ background: IOS.card, borderRadius: 12, padding: '12px 14px' }}>
                        <label style={labelStyle}>Date</label>
                        <input
                            type="date"
                            value={formData.entry_date}
                            onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileStockPortfolioForm;
