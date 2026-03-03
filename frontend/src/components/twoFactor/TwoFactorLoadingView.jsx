import React from 'react';
import { Shield } from 'lucide-react';

const TwoFactorLoadingView = ({ error, setupTwoFactor, setError, handleCancel }) => (
    <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontFamily: 'Inter, sans-serif'
    }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '16px', maxWidth: '500px', width: '90%', textAlign: 'center' }}>
            <Shield size={48} color="#667eea" style={{ marginBottom: '20px' }} />
            {error ? (
                <>
                    <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Setup Failed</h2>
                    <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                            onClick={handleCancel}
                            style={{ padding: '12px 24px', background: '#f3f4f6', border: '2px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => { setError(''); setupTwoFactor(); }}
                            style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Try Again
                        </button>
                    </div>
                </>
            ) : (
                <h2>Setting up Two-Factor Authentication...</h2>
            )}
        </div>
    </div>
);

export default TwoFactorLoadingView;
