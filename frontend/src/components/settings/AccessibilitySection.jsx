import React from 'react';
import { Accessibility } from 'lucide-react';
import API_BASE from '../../config';

// Served by the backend (routes/auth.py) so the link works from the web app and
// from the iOS WKWebView alike.
const ACCESSIBILITY_URL = `${API_BASE.replace(/\/api\/?$/, '')}/accessibility`;

const AccessibilitySection = () => (
    <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '2px solid #e5e7eb'
    }}>
        <h3 style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '16px',
            color: '#111',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            <Accessibility size={18} />
            Accessibility
        </h3>
        <p style={{ color: '#666', fontSize: '0.85rem', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            Read how accessible the app is today and how to report an accessibility problem.
        </p>
        <a
            href={ACCESSIBILITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#667eea', fontWeight: 600, fontSize: '0.95rem' }}
        >
            Accessibility Statement · <span lang="he" dir="rtl">הצהרת נגישות</span>
        </a>
    </div>
);

export default AccessibilitySection;
