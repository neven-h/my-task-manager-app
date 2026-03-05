import React from 'react';
import { X } from 'lucide-react';
import CustomAutocomplete from '../../../components/CustomAutocomplete';

const MobileStockPortfolioForm = ({
    showForm,
    editingEntry,
    formData,
    setFormData,
    stockNames,
    loading,
    onClose,
    onSave,
    theme
}) => {
    if (!showForm) return null;

    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', touchAction: 'none', overscrollBehavior: 'contain' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
            <div
                style={{ width: '100%', maxHeight: '90vh', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y', display: 'flex', flexDirection: 'column' }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0, position: 'sticky', top: 0, background: '#fff', zIndex: 1, paddingBottom: '8px' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                        {editingEntry ? 'Edit Entry' : 'New Entry'}
                    </h2>
                    <button onClick={() => onClose()} style={{ background: 'none', border: 'none', padding: '8px', flexShrink: 0 }}>
                        <X size={28} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Stock Name</label>
                        <CustomAutocomplete value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} options={stockNames} placeholder="Stock name..." />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Ticker Symbol</label>
                        <input type="text" value={formData.ticker_symbol} onChange={(e) => setFormData({ ...formData, ticker_symbol: e.target.value })} style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Currency</label>
                        <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })} style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }}>
                            <option value="USD">USD</option>
                            <option value="ILS">ILS (Israeli Shekel)</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Quantity (units)</label>
                        <input type="text" inputMode="decimal" value={formData.units} onChange={(e) => setFormData({ ...formData, units: e.target.value })} placeholder="e.g. 1, 2.5, 100" style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Value</label>
                        <input type="number" step="0.01" value={formData.value_ils} onChange={(e) => setFormData({ ...formData, value_ils: e.target.value })} style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Percentage</label>
                            <input type="number" step="0.01" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: e.target.value })} style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Base Price (optional)</label>
                            <input type="number" step="0.01" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} placeholder="Optional" style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>Date</label>
                        <input type="date" value={formData.entry_date} onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })} style={{ width: '100%', padding: '12px', border: '3px solid #000', fontSize: '1rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexShrink: 0, paddingTop: '8px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
                        <button onClick={() => onClose()} style={{ flex: 1, padding: '14px', border: '3px solid #000', background: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', touchAction: 'manipulation' }}>
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={loading || !formData.name || !formData.value_ils}
                            style={{ flex: 1, padding: '14px', border: '3px solid #000', background: theme.primary, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', opacity: (loading || !formData.name || !formData.value_ils) ? 0.5 : 1, touchAction: 'manipulation' }}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileStockPortfolioForm;
