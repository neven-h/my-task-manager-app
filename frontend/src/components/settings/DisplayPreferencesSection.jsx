import React from 'react';
import { Languages } from 'lucide-react';

const DisplayPreferencesSection = ({ rtlEnabled, toggleRtl }) => {
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
                <Languages size={18} />
                Display Preferences
            </h3>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#111', fontSize: '0.95rem' }}>
                        Right-to-Left (RTL) Text
                    </p>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
                        Display task titles, descriptions, and notes in RTL direction (e.g. for Arabic or Hebrew).
                    </p>
                </div>
                <button
                    onClick={toggleRtl}
                    style={{
                        padding: '10px 24px',
                        background: rtlEnabled
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'transparent',
                        color: rtlEnabled ? '#fff' : '#667eea',
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
                    {rtlEnabled ? 'RTL: On' : 'RTL: Off'}
                </button>
            </div>
        </div>
    );
};

export default DisplayPreferencesSection;
