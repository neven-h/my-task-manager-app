import React from 'react';
import { Link } from 'react-router-dom';
import PasswordStrengthIndicator from '../PasswordStrengthIndicator';

const ResetPasswordForm = ({ formData, handleChange, handleSubmit, loading, error, allRequirementsMet, passwordStrength }) => (
    <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
            <label style={{
                display: 'block', fontWeight: 700, marginBottom: '8px',
                textTransform: 'uppercase', fontSize: '0.85rem'
            }}>
                New Password *
            </label>
            <input
                type="password" name="password" value={formData.password}
                onChange={handleChange} required
                style={{ width: '100%', padding: '12px', border: '2px solid #000', fontSize: '1rem', fontFamily: 'inherit' }}
                placeholder="••••••••"
            />
            <PasswordStrengthIndicator passwordStrength={passwordStrength} />
        </div>

        <div style={{ marginBottom: '24px' }}>
            <label style={{
                display: 'block', fontWeight: 700, marginBottom: '8px',
                textTransform: 'uppercase', fontSize: '0.85rem'
            }}>
                Confirm Password *
            </label>
            <input
                type="password" name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} required
                style={{ width: '100%', padding: '12px', border: '2px solid #000', fontSize: '1rem', fontFamily: 'inherit' }}
                placeholder="••••••••"
            />
        </div>

        <button
            type="submit" disabled={loading || !allRequirementsMet}
            style={{
                width: '100%', padding: '14px',
                background: allRequirementsMet ? '#dc3545' : '#ccc',
                color: 'white', border: '2px solid #000', fontSize: '1rem', fontWeight: 700,
                textTransform: 'uppercase', cursor: allRequirementsMet ? 'pointer' : 'not-allowed',
                boxShadow: '4px 4px 0 #000', marginBottom: '20px'
            }}
        >
            {loading ? 'Resetting...' : 'Reset Password'}
        </button>

        <div style={{ textAlign: 'center' }}>
            <Link to="/login" style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                ← Back to Login
            </Link>
        </div>
    </form>
);

export default ResetPasswordForm;
