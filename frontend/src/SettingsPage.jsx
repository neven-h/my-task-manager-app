import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, AlertCircle, CheckCircle, ArrowLeft, X, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

const SettingsPage = () => {
    const navigate = useNavigate();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    
    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    const username = localStorage.getItem('username');

    useEffect(() => {
        if (!username) {
            navigate('/login');
            return;
        }
        fetchUserInfo();
    }, [username]);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            // Fetch 2FA status
            const twoFaResponse = await fetch(`${API_BASE}/api/auth/2fa/status?username=${username}`);
            const twoFaData = await twoFaResponse.json();
            setTwoFactorEnabled(Boolean(twoFaData.enabled));
            
            // Fetch user email
            const userResponse = await fetch(`${API_BASE}/api/auth/user-info?username=${username}`);
            if (userResponse.ok) {
                const userData = await userResponse.json();
                setUserEmail(userData.email || '');
            }
        } catch (err) {
            console.error('Error fetching user info:', err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('All fields are required');
            return;
        }
        
        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }
        
        if (currentPassword === newPassword) {
            setPasswordError('New password must be different from current password');
            return;
        }
        
        try {
            setPasswordLoading(true);
            const response = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setPasswordSuccess('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setPasswordSuccess(''), 5000);
            } else {
                setPasswordError(data.error || 'Failed to change password');
            }
        } catch (err) {
            setPasswordError('Network error. Please try again.');
            console.error('Change password error:', err);
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleEnableTwoFactor = () => {
        navigate('/2fa-setup');
    };

    const handleDisableTwoFactor = async (e) => {
        e.preventDefault();
        setError('');
        setDisableLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/auth/2fa/disable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                setTwoFactorEnabled(false);
                setShowDisableModal(false);
                setPassword('');
                setSuccess('Two-Factor Authentication has been disabled successfully.');
                setTimeout(() => setSuccess(''), 5000);
            } else {
                setError(data.error || 'Failed to disable 2FA');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('2FA disable error:', err);
        } finally {
            setDisableLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '16px',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center'
                }}>
                    <Shield size={48} color="#667eea" style={{ marginBottom: '20px' }} />
                    <h2>Loading Settings...</h2>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 20px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px 16px 0 0',
                    padding: '30px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    position: 'relative'
                }}>
                    <button
                        onClick={() => navigate('/tasks')}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            background: 'rgba(102, 126, 234, 0.1)',
                            border: 'none',
                            color: '#667eea',
                            padding: '8px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px 0', color: '#111' }}>
                            Settings
                        </h1>
                        <p style={{ color: '#666', margin: 0 }}>
                            Manage your account security settings
                        </p>
                    </div>
                </div>

                {/* Success Message */}
                {success && (
                    <div style={{
                        background: '#d1fae5',
                        border: '2px solid #10b981',
                        borderRadius: '0',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: '#065f46',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        <CheckCircle size={24} />
                        <span style={{ fontWeight: 600 }}>{success}</span>
                    </div>
                )}

                {/* Security Section */}
                <div style={{
                    background: 'white',
                    borderRadius: success ? '0' : '0 0 16px 16px',
                    padding: '40px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '30px',
                        paddingBottom: '20px',
                        borderBottom: '2px solid #f0f0f0'
                    }}>
                        <Shield size={28} color="#667eea" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111' }}>
                            Security
                        </h2>
                    </div>

                    {/* Two-Factor Authentication Card */}
                    <div style={{
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '24px',
                        background: '#f9fafb'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '20px'
                        }}>
                            <div style={{ flex: '1', minWidth: '250px' }}>
                                <h3 style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    marginBottom: '8px',
                                    color: '#111',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    Two-Factor Authentication
                                    {twoFactorEnabled ? (
                                        <span style={{
                                            background: '#d1fae5',
                                            color: '#065f46',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }}>
                                            Enabled
                                        </span>
                                    ) : (
                                        <span style={{
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600
                                        }}>
                                            Disabled
                                        </span>
                                    )}
                                </h3>
                                <p style={{
                                    color: '#666',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.6',
                                    marginBottom: '16px'
                                }}>
                                    {twoFactorEnabled
                                        ? 'Your account is protected with an extra layer of security. You need your authenticator app to log in.'
                                        : 'Add an extra layer of security by requiring a verification code from your phone when logging in.'}
                                </p>

                                {twoFactorEnabled && (
                                    <div style={{
                                        background: '#fef3c7',
                                        border: '1px solid #f59e0b',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        fontSize: '0.85rem',
                                        color: '#92400e',
                                        lineHeight: '1.5'
                                    }}>
                                        <strong>Recovery:</strong> If you lose your phone, you can disable 2FA from this page using your password.
                                    </div>
                                )}
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                minWidth: '150px'
                            }}>
                                {twoFactorEnabled ? (
                                    <button
                                        onClick={() => setShowDisableModal(true)}
                                        style={{
                                            padding: '12px 24px',
                                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                        }}
                                    >
                                        Disable 2FA
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleEnableTwoFactor}
                                        style={{
                                            padding: '12px 24px',
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontSize: '0.95rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                            whiteSpace: 'nowrap'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                        }}
                                    >
                                        Enable 2FA
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div style={{
                        marginTop: '30px',
                        padding: '20px',
                        background: '#f9fafb',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb'
                    }}>
                        <h3 style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            marginBottom: '12px',
                            color: '#111'
                        }}>
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
                        
                        {/* Change Password Section */}
                        <div style={{
                            borderTop: '2px solid #e5e7eb',
                            paddingTop: '24px'
                        }}>
                            <h4 style={{
                                fontWeight: 700,
                                marginBottom: '16px',
                                color: '#111',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '1rem'
                            }}>
                                <Lock size={18} />
                                Change Password
                            </h4>
                            
                            {passwordError && (
                                <div style={{
                                    background: '#fee2e2',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#991b1b',
                                    fontSize: '0.9rem'
                                }}>
                                    <AlertCircle size={18} />
                                    {passwordError}
                                </div>
                            )}
                            
                            {passwordSuccess && (
                                <div style={{
                                    background: '#d1fae5',
                                    border: '1px solid #10b981',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#065f46',
                                    fontSize: '0.9rem'
                                }}>
                                    <CheckCircle size={18} />
                                    {passwordSuccess}
                                </div>
                            )}
                            
                            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Current Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        marginBottom: '6px', 
                                        fontWeight: 600, 
                                        color: '#333',
                                        fontSize: '0.9rem'
                                    }}>
                                        Current Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter current password"
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 16px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#666',
                                                padding: '4px'
                                            }}
                                        >
                                            {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* New Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        marginBottom: '6px', 
                                        fontWeight: 600, 
                                        color: '#333',
                                        fontSize: '0.9rem'
                                    }}>
                                        New Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password (min 8 characters)"
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 16px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#666',
                                                padding: '4px'
                                            }}
                                        >
                                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Confirm New Password */}
                                <div>
                                    <label style={{ 
                                        display: 'block', 
                                        marginBottom: '6px', 
                                        fontWeight: 600, 
                                        color: '#333',
                                        fontSize: '0.9rem'
                                    }}>
                                        Confirm New Password
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 16px',
                                                border: '2px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '1rem',
                                                boxSizing: 'border-box',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                                            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#666',
                                                padding: '4px'
                                            }}
                                        >
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    style={{
                                        padding: '14px 24px',
                                        background: passwordLoading 
                                            ? '#ccc' 
                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: passwordLoading ? 'not-allowed' : 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                        marginTop: '8px',
                                        alignSelf: 'flex-start'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!passwordLoading) {
                                            e.target.style.transform = 'translateY(-2px)';
                                            e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                                    }}
                                >
                                    {passwordLoading ? 'Changing Password...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Disable 2FA Modal */}
            {showDisableModal && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => {
                            setShowDisableModal(false);
                            setPassword('');
                            setError('');
                        }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            zIndex: 999,
                            animation: 'fadeIn 0.2s ease-out'
                        }}
                    />

                    {/* Modal */}
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '450px',
                        width: '90%',
                        zIndex: 1000,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <button
                            onClick={() => {
                                setShowDisableModal(false);
                                setPassword('');
                                setError('');
                            }}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '8px',
                                color: '#999'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                marginBottom: '16px'
                            }}>
                                <AlertCircle size={32} color="#ef4444" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#111' }}>
                                Disable Two-Factor Authentication
                            </h2>
                            <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                Enter your password to confirm. Your account will be less secure without 2FA.
                            </p>
                        </div>

                        <form onSubmit={handleDisableTwoFactor}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#333',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    marginBottom: '8px'
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
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
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
                                            e.target.style.borderColor = '#ef4444';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#e0e0e0';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div style={{
                                    background: '#fee2e2',
                                    border: '2px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    color: '#991b1b',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginTop: '24px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDisableModal(false);
                                        setPassword('');
                                        setError('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: 'transparent',
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '12px',
                                        color: '#666',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.borderColor = '#999';
                                        e.target.style.color = '#333';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.borderColor = '#e0e0e0';
                                        e.target.style.color = '#666';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={disableLoading}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: disableLoading
                                            ? 'rgba(239, 68, 68, 0.5)'
                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: disableLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!disableLoading) {
                                            e.target.style.transform = 'translateY(-2px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {disableLoading ? 'Disabling...' : 'Disable 2FA'}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        transform: translate(-50%, -40%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, -50%);
                        opacity: 1;
                    }
                }
                @keyframes slideDown {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default SettingsPage;
