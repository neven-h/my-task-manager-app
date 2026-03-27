import React from 'react';
import { Edit2, Copy, Share2, CalendarPlus } from 'lucide-react';
import { THEME } from './theme';
import { addTaskToCalendar, checkCalendarAccess, requestCalendarAccess } from '../../ios/App/calendarPlugin';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

async function handleAddToCalendar(task) {
    if (!isNative()) {
        // Web / desktop: falls back to ICS download inside addTaskToCalendar
        await addTaskToCalendar(task);
        return;
    }

    const { status } = await checkCalendarAccess();

    if (status === 'denied' || status === 'restricted') {
        alert(
            'Calendar access is blocked.\n\n' +
            'To allow it: open Settings → Dr. Pitz Club → Calendars and set to "Full Access".'
        );
        return;
    }

    if (status === 'notDetermined') {
        const { granted } = await requestCalendarAccess();
        if (!granted) {
            alert('Calendar permission was not granted.\n\nTo allow it: open Settings → Dr. Pitz Club → Calendars.');
            return;
        }
    }

    try {
        await addTaskToCalendar(task);
        alert('Task added to your calendar!');
    } catch (err) {
        console.error('Calendar addEvent failed:', err);
        alert('Could not add event to calendar.\n' + (err?.message || err));
    }
}

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
        <button onClick={() => handleAddToCalendar(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Add to Apple Calendar">
            <CalendarPlus size={18} color={THEME.accent} />
        </button>
    </div>
);

export default IOSTaskCardActions;
