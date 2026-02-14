import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ArrowLeft, AlertCircle, Loader, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_BASE from './config';

const LoginPage = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Check if 2FA is required
        if (data.requires_2fa) {
          setRequires2FA(true);
          setLoading(false);
          return;
        }

        // No 2FA required, proceed with login
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', data.username);
        localStorage.setItem('authRole', data.role);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        onLogin(data.token, data.username, data.role);
      } else {
        setError(data.error || 'Invalid username or password');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          code: twoFactorCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', data.username);
        localStorage.setItem('authRole', data.role);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        onLogin(data.token, data.username, data.role);
      } else {
        setError(data.error || 'Invalid verification code');
        setLoading(false);
      }
    } catch (err) {
      console.error('2FA verification error:', err);
      setError('Unable to connect to server. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none'
      }} />

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '30px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '1rem',
          fontWeight: '700',
          transition: 'all 0.3s ease',
          zIndex: 20,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Login card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '50px 40px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        zIndex: 10
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #dc3545 0%, #ffc107 100%)',
            marginBottom: '20px',
            boxShadow: '0 10px 30px rgba(220, 53, 69, 0.3)'
          }}>
            <Lock size={36} color="white" />
          </div>
          <h2 style={{
            color: '#1a1a1a',
            fontSize: '1.8rem',
            fontWeight: '900',
            margin: '0 0 10px 0',
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}>
            Login
          </h2>
          <p style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: 0
          }}>
            Enter your credentials
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'rgba(220, 53, 69, 0.1)',
            border: '1px solid rgba(220, 53, 69, 0.3)',
            borderRadius: '12px',
            marginBottom: '20px',
            color: '#dc3545'
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={requires2FA ? handleVerify2FA : handleSubmit}>
          {/* Show 2FA input if required */}
          {requires2FA ? (
            <>
              {/* Success message */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                marginBottom: '20px',
                color: '#10b981'
              }}>
                <Shield size={20} />
                <span>Password verified. Enter your 2FA code.</span>
              </div>

              {/* 2FA Code field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: '#333',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  6-Digit Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setTwoFactorCode(value);
                  }}
                  placeholder="123456"
                  maxLength={6}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#f5f5f5',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    color: '#1a1a1a',
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    letterSpacing: '0.3em',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffc107';
                    e.target.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <p style={{
                  color: '#666',
                  fontSize: '0.85rem',
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  Open your authenticator app and enter the code
                </p>
              </div>

              {/* Back button */}
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  color: '#666',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#dc3545';
                  e.target.style.color = '#dc3545';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.color = '#666';
                }}
              >
                ← Back to Password
              </button>
            </>
          ) : (
            <>
              {/* Username field */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  color: '#333',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Username
                </label>
            <div style={{ position: 'relative' }}>
              <User 
                size={20} 
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  color: '#1a1a1a',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffc107';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{
              display: 'block',
              color: '#333',
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={20} 
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#999'
                }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 48px',
                  background: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  borderRadius: '12px',
                  color: '#1a1a1a',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffc107';
                  e.target.style.boxShadow = '0 0 0 3px rgba(255, 193, 7, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  color: '#999'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading 
                ? 'rgba(220, 53, 69, 0.5)' 
                : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(220, 53, 69, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(220, 53, 69, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(220, 53, 69, 0.3)';
            }}
          >
            {loading ? (
              <>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                {requires2FA ? 'Verifying...' : 'Logging in...'}
              </>
            ) : (
              requires2FA ? 'Verify Code' : 'Login'
            )}
          </button>

          {/* Forgot Password & Sign Up Links */}
          <div style={{
            marginTop: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center'
          }}>
            <Link
              to="/forgot-password"
              style={{
                color: '#0066cc',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#004499'}
              onMouseLeave={(e) => e.target.style.color = '#0066cc'}
            >
              Forgot Password?
            </Link>
            
            <div style={{
              fontSize: '0.9rem',
              color: '#666'
            }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{
                  color: '#dc3545',
                  textDecoration: 'none',
                  fontWeight: 700,
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#c82333'}
                onMouseLeave={(e) => e.target.style.color = '#dc3545'}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </form>

        {/* Color bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '30px'
        }}>
          <div style={{
            width: '40px',
            height: '4px',
            background: '#dc3545',
            borderRadius: '2px'
          }} />
          <div style={{
            width: '40px',
            height: '4px',
            background: '#ffc107',
            borderRadius: '2px'
          }} />
          <div style={{
            width: '40px',
            height: '4px',
            background: '#0d6efd',
            borderRadius: '2px'
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.9rem',
        letterSpacing: '1px',
        zIndex: 10
      }}>
        drpitz.club
      </div>

      {/* CSS for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
