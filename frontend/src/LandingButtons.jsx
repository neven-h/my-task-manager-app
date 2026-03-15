import React from 'react';
import { Lock, UserPlus } from 'lucide-react';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const LandingButtons = ({ onEnter, onSignUp }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <button onClick={onEnter} style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '18px 50px',
            fontSize: '1.2rem', fontWeight: '700', fontFamily: FONT, color: 'white',
            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
            border: 'none', borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s ease',
            boxShadow: '0 10px 40px rgba(220,53,69,0.4)', textTransform: 'uppercase', letterSpacing: '2px',
        }}
            onMouseEnter={(e) => { e.target.style.transform = 'translateY(-3px) scale(1.02)'; e.target.style.boxShadow = '0 15px 50px rgba(220,53,69,0.5)'; }}
            onMouseLeave={(e) => { e.target.style.transform = 'translateY(0) scale(1)'; e.target.style.boxShadow = '0 10px 40px rgba(220,53,69,0.4)'; }}
        >
            <Lock size={20} /> Enter System
        </button>
        <button onClick={onSignUp} style={{
            display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '14px 40px',
            fontSize: '1rem', fontWeight: '700', fontFamily: FONT, color: 'white',
            background: 'transparent', border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '50px', cursor: 'pointer', transition: 'all 0.3s ease',
            textTransform: 'uppercase', letterSpacing: '2px',
        }}
            onMouseEnter={(e) => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.borderColor = 'rgba(255,255,255,0.8)'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'rgba(255,255,255,0.5)'; e.target.style.transform = 'translateY(0)'; }}
        >
            <UserPlus size={18} /> Sign Up
        </button>
    </div>
);

export default LandingButtons;
