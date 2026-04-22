import React from 'react';
import { Shield, CheckCircle, Scan } from 'lucide-react';
import useSecuritySettings from './hooks/useSecuritySettings';
import useBiometricAuth from './hooks/useBiometricAuth';
import SettingsHeader from './components/settings/SettingsHeader';
import TwoFactorCard from './components/settings/TwoFactorCard';
import ChangePasswordForm from './components/settings/ChangePasswordForm';
import DisplayPreferencesSection from './components/settings/DisplayPreferencesSection';
import DangerZoneSection from './components/settings/DangerZoneSection';
import DisableTwoFactorModal from './components/settings/DisableTwoFactorModal';
import DeleteAccountModal from './components/settings/DeleteAccountModal';
import DescriptionRulesSection from './components/settings/DescriptionRulesSection';
import CategoriesTagsSection from './components/settings/CategoriesTagsSection';


const SettingsPage = () => {
    const settings = useSecuritySettings();
    const biometric = useBiometricAuth();

    if (settings.loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F2F2F7',
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
            background: '#F2F2F7',
            padding: '40px 20px',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <SettingsHeader />

                {settings.success && (
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
                        <span style={{ fontWeight: 600 }}>{settings.success}</span>
                    </div>
                )}

                <div style={{
                    background: 'white',
                    borderRadius: settings.success ? '0' : '0 0 16px 16px',
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

                    <TwoFactorCard
                        twoFactorEnabled={settings.twoFactorEnabled}
                        handleEnableTwoFactor={settings.handleEnableTwoFactor}
                        onOpenDisableModal={() => settings.setShowDisableModal(true)}
                    />

                    {/* Face ID toggle — only visible on iOS devices with biometric support */}
                    {biometric.available && (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '20px', background: '#fff', border: '2px solid #e5e7eb',
                            marginTop: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <Scan size={24} color="#667eea" />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111' }}>
                                        Face ID Login
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '2px' }}>
                                        Sign in quickly using Face ID
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    if (biometric.enabled) {
                                        await biometric.disable();
                                    } else {
                                        const token = localStorage.getItem('authToken');
                                        const user = settings.username;
                                        if (token && user) await biometric.enable(token, user);
                                    }
                                }}
                                disabled={biometric.loading}
                                style={{
                                    width: '52px', height: '28px', borderRadius: '14px',
                                    background: biometric.enabled ? '#667eea' : '#d1d5db',
                                    border: 'none', cursor: biometric.loading ? 'not-allowed' : 'pointer',
                                    position: 'relative', transition: 'background 0.2s',
                                    opacity: biometric.loading ? 0.5 : 1, flexShrink: 0
                                }}
                            >
                                <div style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: '#fff', position: 'absolute', top: '3px',
                                    left: biometric.enabled ? '27px' : '3px',
                                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                            </button>
                        </div>
                    )}

                    <ChangePasswordForm
                        username={settings.username}
                        userEmail={settings.userEmail}
                        currentPassword={settings.currentPassword}
                        setCurrentPassword={settings.setCurrentPassword}
                        newPassword={settings.newPassword}
                        setNewPassword={settings.setNewPassword}
                        confirmPassword={settings.confirmPassword}
                        setConfirmPassword={settings.setConfirmPassword}
                        showCurrentPassword={settings.showCurrentPassword}
                        setShowCurrentPassword={settings.setShowCurrentPassword}
                        showNewPassword={settings.showNewPassword}
                        setShowNewPassword={settings.setShowNewPassword}
                        showConfirmPassword={settings.showConfirmPassword}
                        setShowConfirmPassword={settings.setShowConfirmPassword}
                        passwordError={settings.passwordError}
                        passwordSuccess={settings.passwordSuccess}
                        passwordLoading={settings.passwordLoading}
                        handleChangePassword={settings.handleChangePassword}
                    />

                    {settings.canUseRtl && (
                        <DisplayPreferencesSection
                            rtlEnabled={settings.rtlEnabled}
                            toggleRtl={settings.toggleRtl}
                        />
                    )}

                    <DangerZoneSection
                        onOpenDeleteModal={() => settings.setShowDeleteModal(true)}
                    />

                    {settings.userRole === 'admin' && <DescriptionRulesSection />}

                    <CategoriesTagsSection />
                </div>
            </div>

            {settings.showDisableModal && (
                <DisableTwoFactorModal
                    password={settings.password}
                    setPassword={settings.setPassword}
                    error={settings.error}
                    setError={settings.setError}
                    disableLoading={settings.disableLoading}
                    handleDisableTwoFactor={settings.handleDisableTwoFactor}
                    onClose={() => settings.setShowDisableModal(false)}
                />
            )}

            {settings.showDeleteModal && (
                <DeleteAccountModal
                    deletePassword={settings.deletePassword}
                    setDeletePassword={settings.setDeletePassword}
                    deleteConfirmText={settings.deleteConfirmText}
                    setDeleteConfirmText={settings.setDeleteConfirmText}
                    deleteError={settings.deleteError}
                    setDeleteError={settings.setDeleteError}
                    deleteLoading={settings.deleteLoading}
                    handleDeleteAccount={settings.handleDeleteAccount}
                    onClose={() => settings.setShowDeleteModal(false)}
                />
            )}

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
