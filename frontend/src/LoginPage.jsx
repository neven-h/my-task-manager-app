import React, { useState } from 'react';
import { Lock, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_BASE from './config';
import storage, { STORAGE_KEYS } from './utils/storage';
import LoginForm from './components/auth/LoginForm';
import TwoFactorForm from './components/auth/TwoFactorForm';

const LoginPage = ({ onLogin, onBack }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');

    const saveSession = (data) => {
        storage.set(STORAGE_KEYS.AUTH_TOKEN, data.token);
        storage.set(STORAGE_KEYS.AUTH_USER, data.username);
        storage.set(STORAGE_KEYS.AUTH_ROLE, data.role);
        storage.set(STORAGE_KEYS.USERNAME, data.username);
        storage.set(STORAGE_KEYS.ROLE, data.role);
        onLogin(data.token, data.username, data.role);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
            const data = await response.json();
            if (response.ok && data.success) {
                if (data.requires_2fa) { setRequires2FA(true); setLoading(false); return; }
                saveSession(data);
            } else {
                setError(data.error || 'Invalid username or password');
                setLoading(false);
            }
        } catch {
            setError('Unable to connect to server. Please try again.');
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/2fa/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), code: twoFactorCode }) });
            const data = await response.json();
            if (response.ok && data.success) { saveSession(data); }
            else { setError(data.error || 'Invalid verification code'); setLoading(false); }
        } catch {
            setError('Unable to connect to server. Please try again.');
            setLoading(false);
        }
    };

    const btnStyle = {
        width: '100%', padding: '16px',
        background: loading ? 'rgba(220, 53, 69, 0.5)' : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        border: 'none', borderRadius: '12px', color: 'white', fontSize: '1.1rem', fontWeight: '700',
        cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
        boxShadow: '0 10px 30px rgba(220, 53, 69, 0.3)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '1px'
    };

    return (
        <div style={{ minHeight: '100vh', background: 'url(/background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', padding: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />

            <button onClick={onBack} style={{ position: 'absolute', top: '30px', left: '30px', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '30px', color: 'white', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', transition: 'all 0.3s ease', zIndex: 20, textTransform: 'uppercase', letterSpacing: '1px' }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}>
                <ArrowLeft size={18} /> Back
            </button>

            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '24px', padding: '50px 40px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', zIndex: 10 }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #dc3545 0%, #ffc107 100%)', marginBottom: '20px', boxShadow: '0 10px 30px rgba(220,53,69,0.3)' }}>
                        <Lock size={36} color="white" />
                    </div>
                    <h2 style={{ color: '#1a1a1a', fontSize: '1.8rem', fontWeight: '900', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '-1px' }}>Login</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', margin: 0 }}>Enter your credentials</p>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)', borderRadius: '12px', marginBottom: '20px', color: '#dc3545' }}>
                        <AlertCircle size={20} /> <span>{error}</span>
                    </div>
                )}

                <form onSubmit={requires2FA ? handleVerify2FA : handleSubmit}>
                    {requires2FA ? (
                        <TwoFactorForm code={twoFactorCode} onChange={setTwoFactorCode} onBack={() => { setRequires2FA(false); setTwoFactorCode(''); setError(''); }} />
                    ) : (
                        <LoginForm username={username} password={password} onUsernameChange={setUsername} onPasswordChange={setPassword} />
                    )}

                    <button type="submit" disabled={loading} style={btnStyle}
                        onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 15px 40px rgba(220,53,69,0.4)'; } }}
                        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 10px 30px rgba(220,53,69,0.3)'; }}>
                        {loading ? <><Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />{requires2FA ? 'Verifying...' : 'Logging in...'}</> : (requires2FA ? 'Verify Code' : 'Login')}
                    </button>

                    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                        <Link to="/forgot-password" style={{ color: '#0066cc', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
                            onMouseEnter={(e) => { e.target.style.color = '#004499'; }} onMouseLeave={(e) => { e.target.style.color = '#0066cc'; }}>
                            Forgot Password?
                        </Link>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ color: '#dc3545', textDecoration: 'none', fontWeight: 700 }}
                                onMouseEnter={(e) => { e.target.style.color = '#c82333'; }} onMouseLeave={(e) => { e.target.style.color = '#dc3545'; }}>
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </form>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
                    {['#dc3545', '#ffc107', '#0d6efd'].map(color => (
                        <div key={color} style={{ width: '40px', height: '4px', background: color, borderRadius: '2px' }} />
                    ))}
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: '30px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', letterSpacing: '1px', zIndex: 10 }}>drpitz.club</div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default LoginPage;
