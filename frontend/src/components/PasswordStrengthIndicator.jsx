import React from 'react';

/**
 * Reusable Password Strength Indicator component.
 * Displays validation status for password requirements.
 * 
 * @param {Object} passwordStrength - Object containing validation states:
 *   - hasLength: boolean - At least 8 characters
 *   - hasUppercase: boolean - Has at least one uppercase letter
 *   - hasNumber: boolean - Has at least one number
 *   - hasSymbol: boolean - Has at least one special symbol
 */
const PasswordStrengthIndicator = ({ passwordStrength }) => {
  const requirements = [
    { key: 'hasLength', label: 'At least 8 characters' },
    { key: 'hasUppercase', label: 'One uppercase letter' },
    { key: 'hasNumber', label: 'One number' },
    { key: 'hasSymbol', label: 'One symbol (!@#$%^&*...)' }
  ];

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
        Password Requirements:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {requirements.map(({ key, label }) => (
          <div 
            key={key}
            style={{ 
              color: passwordStrength[key] ? '#28a745' : '#666',
              fontSize: '0.8rem'
            }}
          >
            {passwordStrength[key] ? '✓' : '○'} {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
