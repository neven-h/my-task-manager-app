import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API_BASE from '../config';
import { checkPasswordStrength, allPasswordRequirementsMet } from '../utils/passwordValidation';

const useResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [username, setUsername] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({
        hasLength: false, hasUppercase: false, hasNumber: false, hasSymbol: false
    });

    useEffect(() => {
        if (token) verifyToken();
        else { setError('No reset token provided'); setVerifying(false); }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/verify-token?token=${token}`);
            const data = await response.json();
            if (response.ok && data.valid) {
                setTokenValid(true);
                setUsername(data.username);
            } else {
                setError(data.error || 'Invalid or expired reset link');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'password') setPasswordStrength(checkPasswordStrength(value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
        if (!allPasswordRequirementsMet(passwordStrength)) { setError('Password does not meet all requirements'); return; }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: formData.password })
            });
            const data = await response.json();
            if (response.ok) { setSuccess(true); setTimeout(() => navigate('/login'), 3000); }
            else setError(data.error || 'Failed to reset password');
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return {
        formData, error, success, loading, verifying, tokenValid, username,
        passwordStrength, handleChange, handleSubmit,
        allRequirementsMet: allPasswordRequirementsMet(passwordStrength)
    };
};

export default useResetPassword;
