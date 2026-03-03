import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE from './config';
import AuthPageContainer from './components/AuthPageContainer';
import Alert from './components/Alert';

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

      // Don't assume JSON (404 pages / proxies often return HTML)
      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || `Non-JSON response (status ${response.status})` };
      }

      if (response.ok) {
        // If in development mode and token is returned, show it
        if (data.token && data.reset_url) {
          setMessage(
            `${data.message}\n\nDevelopment Mode - Reset Link:\n${data.reset_url}\n\nToken: ${data.token}`
          );
        } else {
          setMessage(
            data.message ||
              'If that email is registered, you will receive a password reset link shortly. Please check your inbox and spam folder.'
          );
        }
      } else {
        setError(data.error || `Failed to send reset email (status ${response.status})`);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(
        'Network/CORS error. Open DevTools → Console/Network and check the request details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageContainer title="Forgot Password" subtitle="Enter your email to receive a password reset link">
      <Alert type="error" message={error} />
      <Alert type="success" message={message} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}
          >
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
    </AuthPageContainer>
  );
};

export default ForgotPasswordPage;
