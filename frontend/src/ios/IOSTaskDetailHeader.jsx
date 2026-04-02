import React from 'react';
import { X } from 'lucide-react';
import { THEME, FONT_STACK } from './theme';

const IOSTaskDetailHeader = ({ task, isCompleted, onClose }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 20px 16px' }}>
        <div style={{ flex: 1 }}>
            <h2 dir="auto" style={{
                margin: 0, fontSize: '1.3rem', fontWeight: 700,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? '#8E8E93' : '#000',
                wordBreak: 'break-word', unicodeBidi: 'plaintext',
                fontFamily: FONT_STACK,
            }}>
                {task.title}
            </h2>
            <span style={{
                display: 'inline-block', marginTop: 6,
                padding: '3px 10px', borderRadius: 100,
                fontSize: '0.72rem', fontWeight: 600,
                background: isCompleted ? '#34C75920' : `${THEME.accent}20`,
                color: isCompleted ? '#34C759' : THEME.accent,
            }}>
                {isCompleted ? 'Completed' : task.status || 'Pending'}
            </span>
        </div>
        <button
            onClick={onClose}
            style={{
                background: '#F2F2F7', border: 'none', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
        >
            <X size={18} color="#8E8E93" />
        </button>
    </div>
);

export default React.memo(IOSTaskDetailHeader);
