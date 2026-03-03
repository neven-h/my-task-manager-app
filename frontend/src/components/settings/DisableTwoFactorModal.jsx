import React from 'react';
import { Lock, AlertCircle, X } from 'lucide-react';

const modalStyle = {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white', borderRadius: '16px', padding: '30px',
    maxWidth: '450px', width: '90%', zIndex: 1000,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out'
};
const backdropStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)', zIndex: 999, animation: 'fadeIn 0.2s ease-out'
};

const DisableTwoFactorModal = ({ password, setPassword, error, setError, disableLoading, handleDisableTwoFactor, onClose }) => {
    const handleClose = () => { onClose(); setPassword(''); setError(''); };

    return (
        <>
            <div onClick={handleClose} style={backdropStyle} />
            <div style={modalStyle}>
                <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#999' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', marginBottom: '16px' }}>
                        <AlertCircle size={32} color="#ef4444" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#111' }}>
                        Disable Two-Factor Authentication
                    </h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        Enter your password to confirm. Your account will be less secure without 2FA.
                    </p>
                </div>

                <form onSubmit={handleDisableTwoFactor}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                            <input
                                type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required autoFocus
                                placeholder="Enter your password"
                                style={{ width: '100%', padding: '14px 16px 14px 48px', background: '#f5f5f5', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#1a1a1a', fontSize: '1rem', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box' }}
                                onFocus={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', border: '2px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button" onClick={handleClose}
                            style={{ flex: 1, padding: '14px', background: 'transparent', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#666', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.target.style.borderColor = '#999'; e.target.style.color = '#333'; }}
                            onMouseLeave={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.color = '#666'; }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit" disabled={disableLoading}
                            style={{ flex: 1, padding: '14px', background: disableLoading ? 'rgba(239, 68, 68, 0.5)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: disableLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { if (!disableLoading) e.target.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
                        >
                            {disableLoading ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default DisableTwoFactorModal;
