import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import API_BASE from './config';
import storage, { STORAGE_KEYS } from './utils/storage';

const TwoFactorSetup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('loading'); // loading, setup, verify, success
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const username = storage.get(STORAGE_KEYS.USERNAME);
    const role = storage.get(STORAGE_KEYS.ROLE);

    useEffect(() => {
        if (!username) {
            navigate('/login');
            return;
        }
        setupTwoFactor();
    }, [username]);

    const setupTwoFactor = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Add timeout to prevent hanging forever
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.success) {
                setQrCode(data.qr_code);
                setSecret(data.secret);
                setStep('setup');
            } else {
                setError(data.error || 'Failed to setup 2FA');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setError('Request timed out. The server may be unavailable.');
            } else {
                setError(err.message || 'Network error. Please try again.');
            }
            console.error('2FA setup error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');

        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/auth/2fa/enable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    code: verificationCode
                })
            });

            const data = await response.json();

            if (data.success) {
                setStep('success');
            } else {
                setError(data.error || 'Invalid verification code');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('2FA enable error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDone = () => {
        // Navigate back to tasks or settings
        navigate('/tasks');
    };

    const handleCancel = () => {
        navigate(-1); // Go back
    };

    if (step === 'loading') {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center'
                }}>
                    <Shield size={48} color="#667eea" style={{ marginBottom: '20px' }} />
                    {error ? (
                        <>
                            <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Setup Failed</h2>
                            <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={() => navigate(-1)}
                                    style={{
                                        padding: '12px 24px',
                                        background: '#f3f4f6',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Go Back
                                </button>
                                <button
                                    onClick={() => { setError(''); setupTwoFactor(); }}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
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
    }

    if (step === 'success') {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}>
                    <CheckCircle size={64} color="#10b981" style={{ marginBottom: '20px' }} />
                    <h2 style={{ marginBottom: '20px', fontSize: '1.8rem', color: '#111' }}>
                        2FA Enabled Successfully!
                    </h2>
                    <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                        Your account is now protected with Two-Factor Authentication.
                        You'll need your authenticator app every time you log in.
                    </p>

                    <div style={{
                        background: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '30px',
                        textAlign: 'left'
                    }}>
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
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 20px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                maxWidth: '600px',
                margin: '0 auto',
                background: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '30px',
                    color: 'white',
                    position: 'relative'
                }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: 'white',
                            padding: '8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <Shield size={48} style={{ marginBottom: '12px' }} />
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>
                            Enable Two-Factor Authentication
                        </h1>
                        <p style={{ opacity: 0.9, marginTop: '8px', fontSize: '0.95rem' }}>
                            Secure your account with an extra layer of protection
                        </p>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '40px' }}>
                    {/* Step 1: Download App */}
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem'
                            }}>1</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                Download an Authenticator App
                            </h3>
                        </div>
                        <p style={{ color: '#666', marginLeft: '44px', lineHeight: '1.6' }}>
                            Install Google Authenticator, Microsoft Authenticator, or Authy on your phone.
                        </p>
                    </div>

                    {/* Step 2: Scan QR Code */}
                    <div style={{ marginBottom: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem'
                            }}>2</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                Scan this QR Code
                            </h3>
                        </div>

                        <div style={{
                            marginLeft: '44px',
                            background: '#f9fafb',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '30px',
                            textAlign: 'center'
                        }}>
                            {qrCode && (
                                <img
                                    src={qrCode}
                                    alt="2FA QR Code"
                                    style={{
                                        maxWidth: '250px',
                                        width: '100%',
                                        height: 'auto',
                                        border: '4px solid white',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                            )}

                            {/* Manual Entry */}
                            <details style={{ marginTop: '20px', textAlign: 'left' }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    color: '#667eea',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>
                                    Can't scan? Enter manually
                                </summary>
                                <div style={{
                                    marginTop: '12px',
                                    background: 'white',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                                        Secret Key:
                                    </p>
                                    <code style={{
                                        display: 'block',
                                        padding: '12px',
                                        background: '#f3f4f6',
                                        borderRadius: '6px',
                                        fontFamily: 'monospace',
                                        fontSize: '0.9rem',
                                        wordBreak: 'break-all',
                                        color: '#111'
                                    }}>
                                        {secret}
                                    </code>
                                </div>
                            </details>
                        </div>
                    </div>

                    {/* Step 3: Verify */}
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '1.1rem'
                            }}>3</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                                Enter Verification Code
                            </h3>
                        </div>

                        <form onSubmit={handleVerify} style={{ marginLeft: '44px' }}>
                            <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
                                Enter the 6-digit code from your authenticator app:
                            </p>

                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                    setVerificationCode(value);
                                }}
                                placeholder="123456"
                                maxLength={6}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    marginBottom: '12px',
                                    letterSpacing: '0.3em',
                                    fontFamily: 'monospace'
                                }}
                                autoFocus
                            />

                            {error && (
                                <div style={{
                                    background: '#fee2e2',
                                    border: '2px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    color: '#991b1b',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || verificationCode.length !== 6}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    background: verificationCode.length === 6
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : '#d1d5db',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    cursor: verificationCode.length === 6 ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {loading ? 'Verifying...' : (
                                    <>
                                        <Smartphone size={18} />
                                        Verify and Enable 2FA
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TwoFactorSetup;
