import React from 'react';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const inputStyle = {
    width: '100%', padding: '12px 44px 12px 16px',
    border: '2px solid #e5e7eb', borderRadius: '8px',
    fontSize: '1rem', boxSizing: 'border-box', transition: 'border-color 0.2s'
};
const eyeBtnStyle = {
    position: 'absolute', right: '12px', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', color: '#666', padding: '4px'
};

const PasswordField = ({ label, value, onChange, placeholder, show, toggle }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <button type="button" onClick={toggle} style={eyeBtnStyle}>
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    </div>
);

const ChangePasswordForm = ({
    username, userEmail,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    showCurrentPassword, setShowCurrentPassword,
    showNewPassword, setShowNewPassword,
    showConfirmPassword, setShowConfirmPassword,
    passwordError, passwordSuccess, passwordLoading, handleChangePassword,
}) => (
    <div style={{ marginTop: '30px', padding: '20px', background: '#f9fafb', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#111' }}>
            Account Information
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', color: '#666', fontSize: '0.9rem' }}>
                <strong>Username:</strong> <span>{username}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', color: '#666', fontSize: '0.9rem' }}>
                <strong>Email:</strong> <span>{userEmail || 'Not available'}</span>
            </div>
        </div>

        <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '24px' }}>
            <h4 style={{ fontWeight: 700, marginBottom: '16px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <Lock size={18} /> Change Password
            </h4>

            {passwordError && (
                <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
                    <AlertCircle size={18} /> {passwordError}
                </div>
            )}
            {passwordSuccess && (
                <div style={{ background: '#d1fae5', border: '1px solid #10b981', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '0.9rem' }}>
                    <CheckCircle size={18} /> {passwordSuccess}
                </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <PasswordField
                    label="Current Password" value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    show={showCurrentPassword} toggle={() => setShowCurrentPassword(!showCurrentPassword)}
                />
                <PasswordField
                    label="New Password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    show={showNewPassword} toggle={() => setShowNewPassword(!showNewPassword)}
                />
                <PasswordField
                    label="Confirm New Password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    show={showConfirmPassword} toggle={() => setShowConfirmPassword(!showConfirmPassword)}
                />

                <button
                    type="submit"
                    disabled={passwordLoading}
                    style={{
                        padding: '14px 24px',
                        background: passwordLoading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontSize: '1rem', fontWeight: 600,
                        cursor: passwordLoading ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                        marginTop: '8px', alignSelf: 'flex-start'
                    }}
                    onMouseEnter={(e) => { if (!passwordLoading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'; } }}
                    onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'; }}
                >
                    {passwordLoading ? 'Changing Password...' : 'Change Password'}
                </button>
            </form>
        </div>
    </div>
);

export default ChangePasswordForm;
