import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE from '../config';
import { getAuthHeaders } from '../api.js';
import storage, { STORAGE_KEYS } from '../utils/storage';

const useSecuritySettings = () => {
    const navigate = useNavigate();
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    const userRole = storage.get(STORAGE_KEYS.USER_ROLE);
    const canUseRtl = userRole === 'admin' || userRole === 'limited';
    const [rtlEnabled, setRtlEnabledState] = useState(() =>
        storage.get(STORAGE_KEYS.TASK_RTL_ENABLED) === 'true'
    );
    const toggleRtl = () => {
        const next = !rtlEnabled;
        setRtlEnabledState(next);
        storage.set(STORAGE_KEYS.TASK_RTL_ENABLED, String(next));
    };
    const username = storage.get(STORAGE_KEYS.USERNAME);

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        fetchUserInfo();
    }, [username]);

    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const [twoFaResponse, userResponse] = await Promise.all([
                fetch(`${API_BASE}/auth/2fa/status?username=${username}`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE}/auth/user-info?username=${username}`, { headers: getAuthHeaders() }),
            ]);
            const twoFaData = await twoFaResponse.json();
            setTwoFactorEnabled(Boolean(twoFaData.enabled));
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
        setPasswordError(''); setPasswordSuccess('');
        if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('All fields are required'); return; }
        if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters'); return; }
        if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); return; }
        if (currentPassword === newPassword) { setPasswordError('New password must be different from current password'); return; }
        try {
            setPasswordLoading(true);
            const response = await fetch(`${API_BASE}/auth/change-password`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ username, current_password: currentPassword, new_password: newPassword })
            });
            const data = await response.json();
            if (data.success) {
                setPasswordSuccess('Password changed successfully!');
                setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                setTimeout(() => setPasswordSuccess(''), 5000);
            } else { setPasswordError(data.error || 'Failed to change password'); }
        } catch (err) { setPasswordError('Network error. Please try again.'); console.error('Change password error:', err); }
        finally { setPasswordLoading(false); }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteError('');
        if (!deletePassword) { setDeleteError('Password is required'); return; }
        if (deleteConfirmText !== 'DELETE') { setDeleteError('Please type DELETE to confirm'); return; }
        try {
            setDeleteLoading(true);
            const response = await fetch(`${API_BASE}/auth/delete-account`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ username, password: deletePassword })
            });
            const data = await response.json();
            if (data.success) {
                storage.clearAuth();
                navigate('/login', { state: { message: 'Account deleted successfully' } });
            } else { setDeleteError(data.error || 'Failed to delete account'); }
        } catch (err) { setDeleteError('Network error. Please try again.'); console.error('Delete account error:', err); }
        finally { setDeleteLoading(false); }
    };

    const handleEnableTwoFactor = () => navigate('/2fa-setup');

    const handleDisableTwoFactor = async (e) => {
        e.preventDefault();
        setError(''); setDisableLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/2fa/disable`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (data.success) {
                setTwoFactorEnabled(false); setShowDisableModal(false); setPassword('');
                setSuccess('Two-Factor Authentication has been disabled successfully.');
                setTimeout(() => setSuccess(''), 5000);
            } else { setError(data.error || 'Failed to disable 2FA'); }
        } catch (err) { setError('Network error. Please try again.'); console.error('2FA disable error:', err); }
        finally { setDisableLoading(false); }
    };

    return {
        username, userEmail, loading,
        twoFactorEnabled, showDisableModal, setShowDisableModal,
        password, setPassword, error, setError, success, disableLoading,
        handleEnableTwoFactor, handleDisableTwoFactor,
        currentPassword, setCurrentPassword, newPassword, setNewPassword,
        confirmPassword, setConfirmPassword,
        showCurrentPassword, setShowCurrentPassword,
        showNewPassword, setShowNewPassword,
        showConfirmPassword, setShowConfirmPassword,
        passwordError, passwordSuccess, passwordLoading, handleChangePassword,
        showDeleteModal, setShowDeleteModal,
        deletePassword, setDeletePassword,
        deleteConfirmText, setDeleteConfirmText,
        deleteError, setDeleteError, deleteLoading, handleDeleteAccount,
        canUseRtl, rtlEnabled, toggleRtl,
        userRole,
    };
};

export default useSecuritySettings;
