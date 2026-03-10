import React, { useState } from 'react';
import { X, Share2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const IOSShareTaskModal = () => {
    const { shareModal, closeShareModal, shareTask, loading } = useTaskContext();
    const { isOpen, sharingTask } = shareModal;
    const [email, setEmail] = useState('');
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }

    if (!isOpen || !sharingTask) return null;

    const handleShare = async () => {
        setFeedback(null);
        const result = await shareTask(sharingTask.id, email);
        if (result.success) {
            setFeedback({ type: 'success', message: result.message });
            setTimeout(() => {
                setEmail('');
                setFeedback(null);
                closeShareModal();
            }, 1500);
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    const handleClose = () => {
        setEmail('');
        setFeedback(null);
        closeShareModal();
    };

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 300,
                display: 'flex', alignItems: 'flex-end'
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    width: '100%', maxHeight: '65vh', background: '#fff',
                    borderRadius: '16px 16px 0 0',
                    padding: '20px',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                    fontFamily: FONT_STACK, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>Share Task</h2>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', padding: '8px' }}>
                        <X size={28} />
                    </button>
                </div>

                <p style={{ color: THEME.muted, marginBottom: '24px', fontSize: '0.95rem' }}>
                    Share "{sharingTask.title}" via email
                </p>

                {/* Inline feedback */}
                {feedback && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 12, marginBottom: 16,
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

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                        Email Address *
                    </label>
                    <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        placeholder="recipient@example.com"
                        value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && email.trim()) handleShare(); }}
                        style={{
                            width: '100%', padding: '13px 14px',
                            borderRadius: 12,
                            border: '1px solid rgba(0,0,0,0.08)',
                            fontSize: '1rem',
                            fontFamily: FONT_STACK,
                            background: '#F2F2F7',
                            boxSizing: 'border-box',
                            outline: 'none',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleClose} className="mobile-btn" style={{ flex: 1 }} disabled={loading}>Cancel</button>
                    <button onClick={handleShare} className="mobile-btn mobile-btn-primary" style={{ flex: 1 }} disabled={loading || !email.trim()}>
                        <Share2 size={16} style={{ marginRight: '8px' }} />
                        {loading ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IOSShareTaskModal;
