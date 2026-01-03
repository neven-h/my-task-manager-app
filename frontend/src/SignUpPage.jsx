import React, { useState } from 'react';
import { ArrowLeft, UserPlus, User, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const SignUpPage = ({ onBack, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // In a real app, you would make an API call here
      // For now, we'll just show success and store in localStorage
      const userData = {
        username: formData.username,
        email: formData.email,
        createdAt: new Date().toISOString()
      };

      // Store the new user (in a real app, this would be handled by the backend)
      localStorage.setItem('pendingUser', JSON.stringify(userData));

      setSuccess('Account created successfully! Redirecting to login...');
      setLoading(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        if (onSignUpSuccess) {
          onSignUpSuccess();
        } else {
          onBack();
        }
      }, 2000);
    }, 1000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative',
      padding: '20px'
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
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
          fontSize: '1rem',
          fontWeight: '700',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: 'white',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '30px',
          cursor: 'pointer',
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

      {/* Sign-up card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '50px 40px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
        zIndex: 10
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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
            <UserPlus size={36} color="white" />
          </div>
          <h2 style={{
            color: '#1a1a1a',
            fontSize: '1.8rem',
            fontWeight: '900',
            margin: '0 0 10px 0',
            textTransform: 'uppercase',
            letterSpacing: '-1px'
          }}>
            Sign Up
          </h2>
          <p style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: 0
          }}>
            Create your World Wide Pitz account
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

        {/* Success message */}
        {success && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'rgba(5, 150, 105, 0.1)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            borderRadius: '12px',
            marginBottom: '20px',
            color: '#059669'
          }}>
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
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
                name="username"
                value={formData.username}
                onChange={handleChange}
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
                placeholder="Choose a username"
              />
            </div>
          </div>

          {/* Email field */}
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
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
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
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Password field */}
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
                name="password"
                value={formData.password}
                onChange={handleChange}
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
                placeholder="Choose a password"
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

          {/* Confirm Password field */}
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
              Confirm Password
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
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
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
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: '100%',
              padding: '16px',
              background: (loading || success)
                ? 'rgba(220, 53, 69, 0.5)'
                : 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: (loading || success) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 30px rgba(220, 53, 69, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              if (!loading && !success) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 40px rgba(220, 53, 69, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(220, 53, 69, 0.3)';
            }}
          >
            {loading ? 'Creating Account...' : success ? 'Success!' : 'Sign Up'}
          </button>
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
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        zIndex: 10
      }}>
        drpitz.club
      </div>
    </div>
  );
};

export default SignUpPage;
