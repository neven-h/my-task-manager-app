import React from 'react';
import { Trash2 } from 'lucide-react';

const DangerZoneSection = ({ onOpenDeleteModal }) => {
    return (
        <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#fef2f2',
            borderRadius: '12px',
            border: '2px solid #fecaca'
        }}>
            <h3 style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '12px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <Trash2 size={18} />
                Danger Zone
            </h3>
            <p style={{
                color: '#7f1d1d',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                marginBottom: '16px'
            }}>
                Once you delete your account, there is no going back. All your data including tasks, portfolio, and transactions will be permanently deleted.
            </p>
            <button
                onClick={onOpenDeleteModal}
                style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: '2px solid #dc2626',
                    color: '#dc2626',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#dc2626';
                }}
            >
                <Trash2 size={18} />
                Delete Account
            </button>
        </div>
    );
};

export default DangerZoneSection;
