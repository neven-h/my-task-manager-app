import React from 'react';
import { Link } from 'react-router-dom';
import useResetPassword from './hooks/useResetPassword';
import AuthPageContainer from './components/AuthPageContainer';
import Alert from './components/Alert';
import ResetPasswordForm from './components/auth/ResetPasswordForm';

const ResetPasswordPage = () => {
    const {
        formData, error, success, loading, verifying, tokenValid, username,
        passwordStrength, handleChange, handleSubmit, allRequirementsMet
    } = useResetPassword();

    if (verifying) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Verifying reset link...</div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: 'white', border: '3px solid #000', padding: '40px', maxWidth: '460px', boxShadow: '8px 8px 0 #000', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#dc3545' }}>Invalid Reset Link</h1>
                    <p style={{ marginBottom: '24px', color: '#666' }}>{error}</p>
                    <Link to="/forgot-password" style={{ display: 'inline-block', padding: '12px 24px', background: '#dc3545', color: 'white', textDecoration: 'none', border: '2px solid #000', fontWeight: 700, textTransform: 'uppercase', boxShadow: '4px 4px 0 #000' }}>
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: 'white', border: '3px solid #000', padding: '40px', maxWidth: '460px', boxShadow: '8px 8px 0 #000', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#28a745' }}>Password Reset!</h1>
                    <p style={{ marginBottom: '24px', color: '#666' }}>Your password has been successfully reset. Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthPageContainer title="Reset Password" subtitle={`Hello ${username}! Create your new password`}>
            <Alert type="error" message={error} />
            <ResetPasswordForm
                formData={formData}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                loading={loading}
                error={error}
                allRequirementsMet={allRequirementsMet}
                passwordStrength={passwordStrength}
            />
        </AuthPageContainer>
    );
};

export default ResetPasswordPage;
