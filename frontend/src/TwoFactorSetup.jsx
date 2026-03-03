import React from 'react';
import useTwoFactorSetup from './hooks/useTwoFactorSetup';
import TwoFactorLoadingView from './components/twoFactor/TwoFactorLoadingView';
import TwoFactorSuccessView from './components/twoFactor/TwoFactorSuccessView';
import TwoFactorSetupForm from './components/twoFactor/TwoFactorSetupForm';

const TwoFactorSetup = () => {
    const {
        step, qrCode, secret, verificationCode, setVerificationCode,
        error, setError, loading, setupTwoFactor, handleVerify, handleDone, handleCancel
    } = useTwoFactorSetup();

    if (step === 'loading') {
        return <TwoFactorLoadingView error={error} setupTwoFactor={setupTwoFactor} setError={setError} handleCancel={handleCancel} />;
    }
    if (step === 'success') {
        return <TwoFactorSuccessView handleDone={handleDone} />;
    }
    return (
        <TwoFactorSetupForm
            qrCode={qrCode} secret={secret}
            verificationCode={verificationCode} setVerificationCode={setVerificationCode}
            error={error} loading={loading}
            handleVerify={handleVerify} handleCancel={handleCancel}
        />
    );
};

export default TwoFactorSetup;
