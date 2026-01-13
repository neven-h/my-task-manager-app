import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import API_BASE from './config';
import { checkPasswordStrength, allPasswordRequirementsMet } from './utils/passwordValidation';
import PasswordStrengthIndicator from './components/PasswordStrengthIndicator';
import AuthPageContainer from './components/AuthPageContainer';
import Alert from './components/Alert';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });

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

  const allRequirementsMet = allPasswordRequirementsMet(passwordStrength);

  // Check if all fields are filled and valid
  const isFormValid = () => {
    // Check email is filled and valid format
    const emailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

    // Check username is filled and valid (min 3 chars, alphanumeric + underscore)
    const usernameValid = formData.username && formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username);

    // Check password meets all requirements
    const passwordValid = allRequirementsMet;

    // Check passwords match
    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

    return emailValid && usernameValid && passwordValid && passwordsMatch;
  };

  return (
    <AuthPageContainer title="Sign Up" subtitle="Create your account">
      <Alert type="error" message={error} />

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
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                paddingRight: '48px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator passwordStrength={passwordStrength} />
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
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                paddingRight: '48px',
                border: '2px solid #000',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !isFormValid()}
          style={{
            width: '100%',
            padding: '14px',
            background: isFormValid() ? '#dc3545' : '#ccc',
            color: 'white',
            border: '2px solid #000',
            fontSize: '1rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: isFormValid() ? 'pointer' : 'not-allowed',
            boxShadow: '4px 4px 0 #000',
            marginBottom: '20px',
            transition: 'background 0.2s ease'
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
    </AuthPageContainer>
  );
};

export default SignUpPage;
