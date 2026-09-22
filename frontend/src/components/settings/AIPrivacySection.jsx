import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { hasAIConsent, setAIConsent, AI_CONSENT_DISCLOSURE } from '../../utils/aiConsent';

const AIPrivacySection = () => {
    const [enabled, setEnabled] = useState(hasAIConsent);

    const toggle = () => {
        setAIConsent(!enabled);
        setEnabled(!enabled);
    };

    return (
        <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '2px solid #e5e7eb'
        }}>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '16px',
                color: '#111',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Brain size={18} />
                AI &amp; Privacy
            </h3>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#111', fontSize: '0.95rem' }}>
                        AI Financial Advisor (Claude by Anthropic)
                    </p>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                        {AI_CONSENT_DISCLOSURE}
                    </p>
                </div>
                <button
                    onClick={toggle}
                    style={{
                        padding: '10px 24px',
                        background: enabled
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'transparent',
                        color: enabled ? '#fff' : '#667eea',
                        border: '2px solid #667eea',
                        borderRadius: '10px',
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}
                >
                    {enabled ? 'Sharing: Allowed' : 'Sharing: Off'}
                </button>
            </div>
        </div>
    );
};

export default AIPrivacySection;
