import React from 'react';
import { Lock, AlertCircle, Trash2, X } from 'lucide-react';

const modalStyle = {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'white', borderRadius: '16px', padding: '30px',
    maxWidth: '450px', width: '90%', zIndex: 1000,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out'
};
const backdropStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)', zIndex: 999, animation: 'fadeIn 0.2s ease-out'
};
const fieldInputStyle = {
    width: '100%', padding: '14px 16px', background: '#f5f5f5',
    border: '2px solid #e0e0e0', borderRadius: '12px', color: '#1a1a1a',
    fontSize: '1rem', outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box'
};

const DeleteAccountModal = ({
    deletePassword, setDeletePassword,
    deleteConfirmText, setDeleteConfirmText,
    deleteError, setDeleteError,
    deleteLoading, handleDeleteAccount, onClose,
}) => {
    const handleClose = () => { onClose(); setDeletePassword(''); setDeleteConfirmText(''); setDeleteError(''); };
    const onRedFocus = (e) => { e.target.style.borderColor = '#dc2626'; e.target.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.2)'; };
    const onBlur = (e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.boxShadow = 'none'; };

    return (
        <>
            <div onClick={handleClose} style={backdropStyle} />
            <div style={modalStyle}>
                <button onClick={handleClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#999' }}>
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)', marginBottom: '16px' }}>
                        <Trash2 size={32} color="#dc2626" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#111' }}>Delete Account</h2>
                    <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        This action is <strong>permanent</strong> and cannot be undone. All your data will be lost forever.
                    </p>
                </div>

                <form onSubmit={handleDeleteAccount}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                            <input
                                type="password" value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                required autoFocus placeholder="Enter your password"
                                style={{ ...fieldInputStyle, padding: '14px 16px 14px 48px' }}
                                onFocus={onRedFocus} onBlur={onBlur}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#333', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>
                            Type <span style={{ color: '#dc2626', fontWeight: 700 }}>DELETE</span> to confirm
                        </label>
                        <input
                            type="text" value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            required placeholder="DELETE"
                            style={fieldInputStyle}
                            onFocus={onRedFocus} onBlur={onBlur}
                        />
                    </div>

                    {deleteError && (
                        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> {deleteError}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button
                            type="button" onClick={handleClose}
                            style={{ flex: 1, padding: '14px', background: 'transparent', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#666', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.target.style.borderColor = '#999'; e.target.style.color = '#333'; }}
                            onMouseLeave={(e) => { e.target.style.borderColor = '#e0e0e0'; e.target.style.color = '#666'; }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
                            style={{ flex: 1, padding: '14px', background: (deleteLoading || deleteConfirmText !== 'DELETE') ? 'rgba(220, 38, 38, 0.4)' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: (deleteLoading || deleteConfirmText !== 'DELETE') ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { if (!deleteLoading && deleteConfirmText === 'DELETE') e.target.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; }}
                        >
                            {deleteLoading ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default DeleteAccountModal;
