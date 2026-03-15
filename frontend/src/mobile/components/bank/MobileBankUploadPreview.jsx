import React from 'react';
import { FileText } from 'lucide-react';
import { THEME, FONT_STACK } from '../../theme';

const IOS = { blue: '#007AFF', green: '#34C759', red: '#FF3B30' };

const MobileBankUploadPreview = ({ uploadedData, saving, targetTabId, tabs, onDiscard, onSave }) => (
    <div style={{ background: '#f0f9ff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={18} color={IOS.blue} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                {uploadedData.transaction_count} transactions ready
            </span>
            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: 'auto' }}>
                Total: ₪{Math.abs(uploadedData.total_amount).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onDiscard} style={{
                flex: 1, padding: '12px', border: '1px solid #ddd',
                borderRadius: 10, background: '#fff', fontWeight: 600,
                fontSize: '0.88rem', cursor: 'pointer', fontFamily: FONT_STACK,
            }}>
                Cancel
            </button>
            <button onClick={onSave} disabled={saving || !targetTabId} style={{
                flex: 1, padding: '12px', border: 'none',
                borderRadius: 10, background: THEME.primary, color: '#fff',
                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer',
                opacity: (saving || !targetTabId) ? 0.5 : 1, fontFamily: FONT_STACK,
            }}>
                {saving ? 'Saving…' : `Save to ${tabs.find(t => String(t.id) === String(targetTabId))?.name || 'tab'}`}
            </button>
        </div>
    </div>
);

export default MobileBankUploadPreview;
