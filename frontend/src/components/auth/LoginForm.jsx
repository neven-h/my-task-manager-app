import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

const inputStyle = {
    width: '100%', padding: '14px 16px 14px 48px', background: '#f5f5f5',
    border: '2px solid #e0e0e0', borderRadius: '12px', color: '#1a1a1a',
    fontSize: '1rem', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box'
};
const iconStyle = { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' };
const focusStyle = { borderColor: '#ffc107', boxShadow: '0 0 0 3px rgba(255, 193, 7, 0.2)' };
const blurStyle = { borderColor: '#e0e0e0', boxShadow: 'none' };

const LoginForm = ({ username, password, onUsernameChange, onPasswordChange }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Username
                </label>
                <div style={{ position: 'relative' }}>
                    <User size={20} style={iconStyle} />
                    <input
                        type="text" value={username} onChange={(e) => onUsernameChange(e.target.value)}
                        required placeholder="Enter username" style={inputStyle}
                        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                        onBlur={(e) => Object.assign(e.target.style, blurStyle)}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                </label>
                <div style={{ position: 'relative' }}>
                    <Lock size={20} style={iconStyle} />
                    <input
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => onPasswordChange(e.target.value)} required
                        placeholder="Enter password"
                        style={{ ...inputStyle, padding: '14px 48px 14px 48px' }}
                        onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                        onBlur={(e) => Object.assign(e.target.style, blurStyle)}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px', color: '#999' }}>
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>
        </>
    );
};

export default LoginForm;
