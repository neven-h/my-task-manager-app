import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

const useTwoFactorSetup = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState('loading');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const username = storage.get(STORAGE_KEYS.USERNAME);

    useEffect(() => {
        if (!username) {
            navigate('/login');
            return;
        }
        setupTwoFactor();
    }, [username]);

    const setupTwoFactor = async () => {
        try {
            setLoading(true);
            setError('');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(`${API_BASE}/auth/2fa/setup`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ username }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            if (data.success) {
                setQrCode(data.qr_code);
                setSecret(data.secret);
                setStep('setup');
            } else {
                setError(data.error || 'Failed to setup 2FA');
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                setError('Request timed out. The server may be unavailable.');
            } else {
                setError(err.message || 'Network error. Please try again.');
            }
            console.error('2FA setup error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/auth/2fa/enable`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ username, code: verificationCode })
            });
            const data = await response.json();
            if (data.success) { setStep('success'); }
            else { setError(data.error || 'Invalid verification code'); }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('2FA enable error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDone = () => navigate('/tasks');
    const handleCancel = () => navigate(-1);

    return {
        step, qrCode, secret, verificationCode, setVerificationCode,
        error, setError, loading, setupTwoFactor, handleVerify, handleDone, handleCancel
    };
};

export default useTwoFactorSetup;
