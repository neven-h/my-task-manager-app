import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API_BASE from './config';
import { checkPasswordStrength, allPasswordRequirementsMet } from './utils/passwordValidation';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [username, setUsername] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('No reset token provided');
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-token?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setTokenValid(true);
        setUsername(data.username);
      } else {
        setError(data.error || 'Invalid or expired reset link');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!allPasswordRequirementsMet(passwordStrength)) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allRequirementsMet = allPasswordRequirementsMet(passwordStrength);

  if (verifying) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Verifying reset link...</div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          border: '3px solid #000',
          padding: '40px',
          maxWidth: '460px',
          boxShadow: '8px 8px 0 #000',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#dc3545' }}>
            Invalid Reset Link
          </h1>
          <p style={{ marginBottom: '24px', color: '#666' }}>{error}</p>
          <Link 
            to="/forgot-password"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#dc3545',
              color: 'white',
              textDecoration: 'none',
              border: '2px solid #000',
              fontWeight: 700,
              textTransform: 'uppercase',
              boxShadow: '4px 4px 0 #000'
            }}
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          border: '3px solid #000',
          padding: '40px',
          maxWidth: '460px',
          boxShadow: '8px 8px 0 #000',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#28a745' }}>
            Password Reset!
          </h1>
          <p style={{ marginBottom: '24px', color: '#666' }}>
            Your password has been successfully reset. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

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
          Reset Password
        </h1>
        <p style={{ marginBottom: '32px', color: '#666', fontSize: '0.95rem' }}>
          Hello {username}! Create your new password
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              New Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="••••••••"
            />
            
            <PasswordStrengthIndicator passwordStrength={passwordStrength} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !allRequirementsMet}
            style={{
              width: '100%',
              padding: '14px',
              background: allRequirementsMet ? '#dc3545' : '#ccc',
              color: 'white',
              border: '2px solid #000',
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: allRequirementsMet ? 'pointer' : 'not-allowed',
              boxShadow: '4px 4px 0 #000',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;
