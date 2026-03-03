import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from './config';
import { checkPasswordStrength, allPasswordRequirementsMet } from './utils/passwordValidation';
import AuthPageContainer from './components/AuthPageContainer';
import Alert from './components/Alert';
import SignUpFormFields from './components/auth/SignUpFormFields';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ hasLength: false, hasUppercase: false, hasNumber: false, hasSymbol: false });

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
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, username: formData.username, password: formData.password })
            });
            const data = await response.json();
            if (response.ok) { alert('Account created successfully! You can now log in.'); navigate('/login'); }
            else { setError(data.error || 'Failed to create account'); }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const emailValid = formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const usernameValid = formData.username && formData.username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(formData.username);
    const isFormValid = emailValid && usernameValid && allPasswordRequirementsMet(passwordStrength) &&
        formData.password === formData.confirmPassword && formData.confirmPassword !== '';

    return (
        <AuthPageContainer title="Sign Up" subtitle="Create your account">
            <Alert type="error" message={error} />
            <SignUpFormFields
                formData={formData} handleChange={handleChange}
                showPassword={showPassword} setShowPassword={setShowPassword}
                showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
                passwordStrength={passwordStrength} isFormValid={isFormValid}
                loading={loading} handleSubmit={handleSubmit}
            />
        </AuthPageContainer>
    );
};

export default SignUpPage;
