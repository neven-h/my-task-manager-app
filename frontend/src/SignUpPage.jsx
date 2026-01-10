import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_BASE from './config';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      hasLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check all password requirements
    if (!passwordStrength.hasLength || !passwordStrength.hasUppercase || 
        !passwordStrength.hasNumber || !passwordStrength.hasSymbol) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Account created successfully! You can now log in.');
        navigate('/login');
      } else {
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allRequirementsMet = Object.values(passwordStrength).every(v => v);

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
          Sign Up
        </h1>
        <p style={{ marginBottom: '32px', color: '#666', fontSize: '0.95rem' }}>
          Create your account
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
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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

          {/* Username */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              minLength={3}
              pattern="[a-zA-Z0-9_]+"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="username"
            />
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
              Letters, numbers, and underscores only (min 3 chars)
            </small>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontWeight: 700,
              marginBottom: '8px',
              textTransform: 'uppercase',
              fontSize: '0.85rem'
            }}>
              Password *
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
            
            {/* Password Strength Indicator */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Password Requirements:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  color: passwordStrength.hasLength ? '#28a745' : '#666',
                  fontSize: '0.8rem'
                }}>
                  {passwordStrength.hasLength ? '✓' : '○'} At least 8 characters
                </div>
                <div style={{ 
                  color: passwordStrength.hasUppercase ? '#28a745' : '#666',
                  fontSize: '0.8rem'
                }}>
                  {passwordStrength.hasUppercase ? '✓' : '○'} One uppercase letter
                </div>
                <div style={{ 
                  color: passwordStrength.hasNumber ? '#28a745' : '#666',
                  fontSize: '0.8rem'
                }}>
                  {passwordStrength.hasNumber ? '✓' : '○'} One number
                </div>
                <div style={{ 
                  color: passwordStrength.hasSymbol ? '#28a745' : '#666',
                  fontSize: '0.8rem'
                }}>
                  {passwordStrength.hasSymbol ? '✓' : '○'} One symbol (!@#$%^&*...)
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
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

          {/* Submit Button */}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          {/* Back to Login */}
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

export default SignUpPage;
