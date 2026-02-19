import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const ShareTaskModal = () => {
    const { shareModal, closeShareModal, shareTask, loading } = useTaskContext();
    const { isOpen, sharingTask } = shareModal;
    const [shareEmail, setShareEmail] = useState('');

    const handleShare = async () => {
        const success = await shareTask(sharingTask.id, shareEmail);
        if (success) {
            setShareEmail('');
            closeShareModal();
        }
    };

    const handleClose = () => {
        setShareEmail('');
        closeShareModal();
    };

    if (!isOpen || !sharingTask) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    background: '#fff',
                    border: '3px solid #000',
                    padding: '32px',
                    maxWidth: '500px',
                    width: '90%',
                    boxShadow: '8px 8px 0 #000'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    marginBottom: '8px',
                    textTransform: 'uppercase'
                }}>
                    Share Task via Email
                </h2>
                <p style={{color: '#666', marginBottom: '24px'}}>
                    Share "{sharingTask.title}" with someone
                </p>

                <div style={{marginBottom: '24px'}}>
                    <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '0.85rem'
                    }}>
                        Email Address *
                    </label>
                    <input
                        type="email"
                        placeholder="recipient@example.com"
                        value={shareEmail}
                        onChange={(e) => setShareEmail(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && shareEmail.trim()) {
                                handleShare();
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #000',
                            fontSize: '1rem'
                        }}
                        autoFocus
                    />
                </div>

                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                    <button
                        className="btn btn-white"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-blue"
                        onClick={handleShare}
                        disabled={loading || !shareEmail.trim()}
                    >
                        <Share2 size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                        {loading ? 'Sharing...' : 'Share Task'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareTaskModal;
