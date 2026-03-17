import React from 'react';
import { ArrowLeft, FileDown } from 'lucide-react';
import { FONT_STACK } from '../../../ios/theme';

const IOS_BLUE = '#007AFF';
const IOS_RED  = '#FF3B30';
const IOS_SEP  = 'rgba(0,0,0,0.08)';

/**
 * MobileBudgetHeader — sticky top bar with back, title, select, and export.
 */
const MobileBudgetHeader = ({ onBack, selectMode, onToggleSelectMode, entriesEmpty, onExport }) => (
    <div style={{
        background: '#fff',
        borderBottom: `0.5px solid ${IOS_SEP}`,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)',
        paddingBottom: 12,
        paddingLeft: 8,
        paddingRight: 8,
        position: 'sticky',
        top: 0,
        zIndex: 100,
    }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px 44px', alignItems: 'center' }}>
            <button onClick={onBack} style={{
                background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <ArrowLeft size={22} color={IOS_BLUE} />
            </button>

            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, textAlign: 'center' }}>
                Budget Planner
            </h1>

            <button onClick={onToggleSelectMode} style={{
                background: 'none', border: 'none', padding: '10px', cursor: 'pointer',
                minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: selectMode ? IOS_RED : IOS_BLUE, fontWeight: 600, fontSize: '0.78rem',
                fontFamily: FONT_STACK,
            }}>
                {selectMode ? 'Done' : 'Select'}
            </button>

            <button onClick={onExport} disabled={entriesEmpty} style={{
                background: 'none', border: 'none', padding: '10px',
                cursor: entriesEmpty ? 'default' : 'pointer',
                minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: entriesEmpty ? 0.3 : 1,
            }}>
                <FileDown size={20} color={IOS_BLUE} />
            </button>
        </div>
    </div>
);

export default MobileBudgetHeader;
