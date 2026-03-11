import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, UserCircle } from 'lucide-react';

const MENU_ITEM = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '11px 14px', background: 'none', border: 'none',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
    fontFamily: 'inherit', textAlign: 'left',
};

const UserMenuButton = ({ authUser, isAdmin, onLogout }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0, marginLeft: 8 }}>
            <button
                onClick={() => setOpen(v => !v)}
                title={authUser}
                style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#000', color: '#fff', border: '2px solid #000',
                    cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
            >
                {authUser ? authUser[0].toUpperCase() : <UserCircle size={18} />}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: '#fff', border: '3px solid #000',
                    boxShadow: '4px 4px 0px #000', minWidth: 185, zIndex: 200,
                }}>
                    <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.85rem', borderBottom: '2px solid #000' }}>
                        👤 {authUser}
                        {isAdmin && <span style={{ fontSize: '0.75rem', marginLeft: 6, color: '#666' }}>(admin)</span>}
                    </div>
                    <button
                        onClick={() => { navigate('/settings'); setOpen(false); }}
                        style={MENU_ITEM}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <Settings size={14} /> Settings
                    </button>
                    <div style={{ borderTop: '2px solid #000' }} />
                    {onLogout && (
                        <button
                            onClick={() => { onLogout(); setOpen(false); }}
                            style={{ ...MENU_ITEM, color: '#FF0000' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserMenuButton;
