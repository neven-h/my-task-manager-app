import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const TwoFactorSuccessView = ({ handleDone }) => (
    <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: 'Inter, sans-serif'
    }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '500px', width: '90%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '20px', fontSize: '1.8rem', color: '#111' }}>
                2FA Enabled Successfully!
            </h2>
            <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                Your account is now protected with Two-Factor Authentication.
                You'll need your authenticator app every time you log in.
            </p>
            <div style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '12px', padding: '20px', marginBottom: '30px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertCircle size={24} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#92400e' }}>
                            What if I lose my phone?
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#92400e', lineHeight: '1.5', margin: 0 }}>
                            If you lose your phone, you can disable 2FA from any device where you're still logged in
                            by going to Settings → Security. You'll need your password to disable it.
                        </p>
                    </div>
                </div>
            </div>
            <button
                onClick={handleDone}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
                Done
            </button>
        </div>
    </div>
);

export default TwoFactorSuccessView;
