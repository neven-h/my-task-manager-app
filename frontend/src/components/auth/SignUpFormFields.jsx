import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

const inputStyle = { width: '100%', padding: '12px', border: '2px solid #000', fontSize: '1rem', fontFamily: 'inherit' };
const labelStyle = { display: 'block', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', fontSize: '0.85rem' };
const eyeBtnStyle = { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const SignUpFormFields = ({
    formData, handleChange, showPassword, setShowPassword,
    showConfirmPassword, setShowConfirmPassword, passwordStrength,
    isFormValid, loading, handleSubmit
}) => (
    <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required
                style={inputStyle} placeholder="your.email@example.com" />
        </div>

        {/* Username */}
        <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Username *</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange}
                required minLength={3} pattern="[a-zA-Z0-9_]+" style={inputStyle} placeholder="username" />
            <small style={{ color: '#666', fontSize: '0.8rem' }}>
                Letters, numbers, and underscores only (min 3 chars)
            </small>
        </div>

        {/* Password */}
        <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Password *</label>
            <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                    onChange={handleChange} required style={{ ...inputStyle, paddingRight: '48px' }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}
                    title={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
            <PasswordStrengthIndicator passwordStrength={passwordStrength} />
        </div>

        {/* Confirm Password */}
        <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Confirm Password *</label>
            <div style={{ position: 'relative' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange} required
                    style={{ ...inputStyle, paddingRight: '48px' }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={eyeBtnStyle}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
        </div>

        {/* Submit */}
        <button
            type="submit" disabled={loading || !isFormValid}
            style={{ width: '100%', padding: '14px', background: isFormValid ? '#dc3545' : '#ccc', color: 'white', border: '2px solid #000', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', cursor: isFormValid ? 'pointer' : 'not-allowed', boxShadow: '4px 4px 0 #000', marginBottom: '20px', transition: 'background 0.2s ease' }}
        >
            {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                ← Back to Login
            </Link>
        </div>
    </form>
);

export default SignUpFormFields;
