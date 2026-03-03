import React from 'react';

const TwoFactorCard = ({
    twoFactorEnabled,
    handleEnableTwoFactor,
    onOpenDisableModal,
}) => {
    return (
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
                            onClick={onOpenDisableModal}
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
    );
};

export default TwoFactorCard;
