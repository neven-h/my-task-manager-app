import React from 'react';
import { Menu } from 'lucide-react';
import { useMobileTask } from '../MobileTaskContext';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileHeader = () => {
    const { setShowSidebar } = useMobileTask();

    return (
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '4px solid #000' }}>
            <div style={{ height: '12px', width: '100%', background: '#F8B4D9' }} />
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{
                    fontFamily: FONT_STACK, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',
                    fontWeight: 900, margin: 0, letterSpacing: '-1px',
                    textTransform: 'uppercase', color: '#000'
                }}>
                    TASK TRACKER
                </h1>
                <button
                    onClick={() => setShowSidebar(true)}
                    style={{ background: '#fff', border: '3px solid #000', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Menu"
                >
                    <Menu size={24} color="#000" />
                </button>
            </div>
        </div>
    );
};

export default React.memo(MobileHeader);
