import React from 'react';
import { Shield } from 'lucide-react';

const TwoFactorForm = ({ code, onChange, onBack }) => (
    <>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', marginBottom: '20px', color: '#10b981' }}>
            <Shield size={20} />
            <span>Password verified. Enter your 2FA code.</span>
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                6-Digit Code
            </label>
            <input
                type="text" value={code}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" maxLength={6} autoFocus required
                style={{ width: '100%', padding: '14px 16px', background: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#1a1a1a', fontSize: '1.5rem', fontWeight: '600', textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = '#ffc107'; e.target.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none'; }}
            />
            <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '8px', textAlign: 'center' }}>Open your authenticator app and enter the code</p>
        </div>

        <button type="button" onClick={onBack}
            style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#666', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', marginBottom: '12px', transition: 'all 0.3s ease' }}
            onMouseEnter={(e) => { e.target.style.borderColor = '#dc3545'; e.target.style.color = '#dc3545'; }}
            onMouseLeave={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.color = '#666'; }}>
            ← Back to Password
        </button>
    </>
);

export default TwoFactorForm;
