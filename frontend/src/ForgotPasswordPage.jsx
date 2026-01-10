import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE from './config';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('If that email is registered, you will receive a password reset link shortly. Please check your inbox and spam folder.');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f8f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        border: '3px solid #000',
        padding: '40px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '8px 8px 0 #000'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          marginBottom: '8px',
          letterSpacing: '-1px'
        }}>
          Forgot Password
        </h1>
        <p style={{ marginBottom: '32px', color: '#666', fontSize: '0.95rem' }}>
          Enter your email to receive a password reset link
        </p>

        {error && (
          <div style={{
            background: '#dc3545',
            color: 'white',
            padding: '12px 16px',
            marginBottom: '20px',
            border: '2px solid #000',
            fontWeight: 600
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: '#28a745',
            color: 'white',
            padding: '12px 16px',
            marginBottom: '20px',
            border: '2px solid #000',
            fontWeight: 600
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="your.email@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: '#dc3545',
              color: 'white',
              border: '2px solid #000',
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '4px 4px 0 #000',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <Link 
              to="/login"
              style={{
                color: '#0066cc',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
