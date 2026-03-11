import React, { useState } from 'react';
import { Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const ShareTaskModal = () => {
    const { shareModal, closeShareModal, shareTask, loading } = useTaskContext();
    const { isOpen, sharingTask } = shareModal;
    const [shareEmail, setShareEmail] = useState('');
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

    const handleShare = async () => {
        setFeedback(null);
        const result = await shareTask(sharingTask.id, shareEmail);
        if (result.success) {
            setFeedback({ type: 'success', message: result.message });
            setTimeout(() => {
                setShareEmail('');
                setFeedback(null);
                closeShareModal();
            }, 1500);
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const handleClose = () => {
        setShareEmail('');
        setFeedback(null);
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

                {/* Inline feedback */}
                {feedback && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', marginBottom: 16,
                        border: `2px solid ${feedback.type === 'success' ? '#2E7D32' : '#C62828'}`,
                        background: feedback.type === 'success' ? '#E8F5E9' : '#FFEBEE',
                        color: feedback.type === 'success' ? '#2E7D32' : '#C62828',
                        fontSize: '0.88rem', fontWeight: 600,
                    }}>
                        {feedback.type === 'success'
                            ? <CheckCircle size={18} />
                            : <AlertCircle size={18} />}
                        {feedback.message}
                    </div>
                )}

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
                        onKeyDown={(e) => {
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
