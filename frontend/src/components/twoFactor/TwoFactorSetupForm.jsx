import React from 'react';
import { Shield, ArrowLeft, Smartphone, AlertCircle } from 'lucide-react';

const TwoFactorSetupForm = ({ qrCode, secret, verificationCode, setVerificationCode, error, loading, handleVerify, handleCancel }) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', color: 'white', position: 'relative' }}>
                <button
                    onClick={handleCancel}
                    style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <Shield size={48} style={{ marginBottom: '12px' }} />
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Enable Two-Factor Authentication</h1>
                    <p style={{ opacity: 0.9, marginTop: '8px', fontSize: '0.95rem' }}>Secure your account with an extra layer of protection</p>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '40px' }}>
                {/* Step 1 */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>1</div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Download an Authenticator App</h3>
                    </div>
                    <p style={{ color: '#666', marginLeft: '44px', lineHeight: '1.6' }}>
                        Install Google Authenticator, Microsoft Authenticator, or Authy on your phone.
                    </p>
                </div>

                {/* Step 2 */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>2</div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Scan this QR Code</h3>
                    </div>
                    <div style={{ marginLeft: '44px', background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
                        {qrCode && (
                            <img src={qrCode} alt="2FA QR Code" style={{ maxWidth: '250px', width: '100%', height: 'auto', border: '4px solid white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        )}
                        <details style={{ marginTop: '20px', textAlign: 'left' }}>
                            <summary style={{ cursor: 'pointer', color: '#667eea', fontWeight: 600, fontSize: '0.9rem' }}>Can't scan? Enter manually</summary>
                            <div style={{ marginTop: '12px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>Secret Key:</p>
                                <code style={{ display: 'block', padding: '12px', background: '#f3f4f6', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all', color: '#111' }}>{secret}</code>
                            </div>
                        </details>
                    </div>
                </div>

                {/* Step 3 */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem' }}>3</div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Enter Verification Code</h3>
                    </div>
                    <form onSubmit={handleVerify} style={{ marginLeft: '44px' }}>
                        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>Enter the 6-digit code from your authenticator app:</p>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            maxLength={6}
                            style={{ width: '100%', padding: '16px', fontSize: '1.5rem', fontWeight: 600, textAlign: 'center', border: '2px solid #e5e7eb', borderRadius: '12px', marginBottom: '12px', letterSpacing: '0.3em', fontFamily: 'monospace' }}
                            autoFocus
                        />
                        {error && (
                            <div style={{ background: '#fee2e2', border: '2px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={18} />{error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || verificationCode.length !== 6}
                            style={{ width: '100%', padding: '14px', background: verificationCode.length === 6 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#d1d5db', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: verificationCode.length === 6 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                            {loading ? 'Verifying...' : (<><Smartphone size={18} />Verify and Enable 2FA</>)}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
);

export default TwoFactorSetupForm;
