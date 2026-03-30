import React, { useState, useEffect } from 'react';
import MobileStockPortfolioFormFields from './MobileStockPortfolioFormFields';

const IOS = {
    bg: '#F2F2F7', card: '#FFFFFF', blue: '#007AFF', muted: '#8E8E93',
    separator: 'rgba(60,60,67,0.12)', spring: 'cubic-bezier(0.22,1,0.36,1)',
};

const MobileStockPortfolioForm = ({ showForm, editingEntry, formData, setFormData, stockNames, loading, onClose, onSave, theme }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (showForm) { requestAnimationFrame(() => setMounted(true)); }
        else { setMounted(false); }
    }, [showForm]);

    if (!showForm) return null;

    const canSave = !loading && formData.name && formData.value_ils;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: `rgba(0,0,0,${mounted ? 0.4 : 0})`,
                zIndex: 200, display: 'flex', alignItems: 'flex-end',
                touchAction: 'none', overscrollBehavior: 'contain',
                transition: `background 300ms ${IOS.spring}`,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
        >
            <div
                style={{
                    width: '100%', maxHeight: '92vh', background: IOS.bg,
                    borderRadius: '20px 20px 0 0',
                    paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
                    overflowY: 'hidden', overflowX: 'hidden',
                    overscrollBehavior: 'contain',
                    touchAction: 'pan-y', display: 'flex', flexDirection: 'column',
                    transform: mounted ? 'translateY(0)' : 'translateY(100%)',
                    transition: `transform 380ms ${IOS.spring}`,
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px', paddingBottom: '2px', flexShrink: 0 }}>
                    <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(60,60,67,0.18)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', padding: '6px 16px 12px', flexShrink: 0, borderBottom: `0.5px solid ${IOS.separator}` }}>
                    <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: IOS.blue, fontSize: '1rem', textAlign: 'left', padding: '6px 0', fontFamily: 'inherit' }}>
                        Cancel
                    </button>
                    <span style={{ textAlign: 'center', fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.2px' }}>
                        {editingEntry ? 'Edit Entry' : 'New Entry'}
                    </span>
                    <button type="button" onClick={onSave} disabled={!canSave} style={{ background: 'none', border: 'none', cursor: canSave ? 'pointer' : 'default', color: canSave ? IOS.blue : IOS.muted, fontSize: '1rem', fontWeight: 600, textAlign: 'right', padding: '6px 0', fontFamily: 'inherit' }}>
                        {loading ? 'Saving…' : 'Save'}
                    </button>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <MobileStockPortfolioFormFields formData={formData} setFormData={setFormData} stockNames={stockNames} />
                </div>
            </div>
        </div>
    );
};

export default MobileStockPortfolioForm;
