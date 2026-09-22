import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AI_CONSENT_DISCLOSURE } from '../../utils/aiConsent';

/** Shown in place of the AI advisor until the user allows sharing data with Anthropic. */
const AIConsentNotice = ({ onAllow, onDecline }) => (
    <div style={{ padding: 16 }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 700, fontSize: '0.92rem', color: '#111', marginBottom: 8,
        }}>
            <ShieldCheck size={16} />
            Share spending data with Anthropic?
        </div>
        <p style={{ fontSize: '0.83rem', color: '#444', lineHeight: 1.5, margin: '0 0 8px' }}>
            {AI_CONSENT_DISCLOSURE}
        </p>
        <p style={{ fontSize: '0.78rem', color: '#666', lineHeight: 1.5, margin: '0 0 14px' }}>
            Nothing is sent unless you allow it. You can turn this off anytime in Settings.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" onClick={onDecline} style={{
                padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8,
                background: '#fff', color: '#111', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}>
                Not now
            </button>
            <button type="button" onClick={onAllow} style={{
                padding: '8px 16px', border: 'none', borderRadius: 8,
                background: '#111', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
            }}>
                Allow
            </button>
        </div>
    </div>
);

export default AIConsentNotice;
