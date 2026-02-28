import React, { useState } from 'react';
import { X, Share2 } from 'lucide-react';
import { useMobileTask } from '../MobileTaskContext';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileShareTaskModal = () => {
    const { showShareModal, closeShareModal, sharingTask, shareTask, loading } = useMobileTask();
    const [email, setEmail] = useState('');

    if (!showShareModal || !sharingTask) return null;

    const handleShare = async () => {
        const ok = await shareTask(sharingTask.id, email);
        if (ok) { setEmail(''); closeShareModal(); }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }} onClick={closeShareModal}>
            <div style={{ width: '100%', maxHeight: '65vh', background: '#fff', borderRadius: '16px 16px 0 0', padding: '20px', fontFamily: FONT_STACK, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>Share Task</h2>
                    <button onClick={closeShareModal} style={{ background: 'none', border: 'none', padding: '8px' }}><X size={28} /></button>
                </div>
                <p style={{ color: '#666', marginBottom: '24px', fontSize: '0.95rem' }}>Share "{sharingTask.title}" via email</p>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.5px' }}>Email Address *</label>
                    <input type="email" placeholder="recipient@example.com" value={email} onChange={e => setEmail(e.target.value)}
                        onKeyPress={e => { if (e.key === 'Enter' && email.trim()) handleShare(); }}
                        style={{ width: '100%', padding: '12px', border: '2px solid #000', fontSize: '1rem', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={closeShareModal} className="mobile-btn" style={{ flex: 1 }} disabled={loading}>Cancel</button>
                    <button onClick={handleShare} className="mobile-btn mobile-btn-primary" style={{ flex: 1 }} disabled={loading || !email.trim()}>
                        <Share2 size={16} style={{ marginRight: '8px' }} />
                        {loading ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileShareTaskModal;
