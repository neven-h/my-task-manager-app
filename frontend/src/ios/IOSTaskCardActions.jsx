import React from 'react';
import { Edit2, Copy, Share2, CalendarPlus } from 'lucide-react';
import { THEME } from './theme';
import { downloadICS } from '../utils/generateICS';

const IOSTaskCardActions = ({ task, openEditTaskForm, duplicateTask, openShareModal }) => (
    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        <button onClick={() => openEditTaskForm(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Edit task">
            <Edit2 size={18} color="#8E8E93" />
        </button>
        <button onClick={() => duplicateTask(task.id)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Duplicate task">
            <Copy size={18} color="#8E8E93" />
        </button>
        <button onClick={() => openShareModal(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Share task">
            <Share2 size={18} color="#8E8E93" />
        </button>
        <button onClick={() => downloadICS(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Add to Apple Calendar">
            <CalendarPlus size={18} color={THEME.accent} />
        </button>
    </div>
);

export default IOSTaskCardActions;
