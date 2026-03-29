import React from 'react';
import { Edit2, Copy, Share2, CalendarPlus } from 'lucide-react';
import { THEME } from './theme';
import { addTaskToCalendar, checkCalendarAccess, requestCalendarAccess } from '../../ios/App/calendarPlugin';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

const calendarAllowed = (s) => ['authorized', 'fullAccess', 'writeOnly'].includes(s);

async function handleAddToCalendar(task) {
    if (!isNative()) {
        // Web / desktop: falls back to ICS download inside addTaskToCalendar
        await addTaskToCalendar(task);
        return;
    }

    let { status } = await checkCalendarAccess();

    if (status === 'denied' || status === 'restricted') {
        alert(
            'Calendar access is blocked.\n\n' +
            'To allow it: Settings → Dr. Pitz Club → Calendars (or Settings → Privacy & Security → Calendars).'
        );
        return;
    }

    if (!calendarAllowed(status)) {
        const result = await requestCalendarAccess();
        status = result.status;
        if (!result.granted && !calendarAllowed(status)) {
            alert(
                'Calendar permission was not granted.\n\n' +
                'Enable it under Settings → Privacy & Security → Calendars → Dr. Pitz Club. ' +
                'If the app is not listed, delete and reinstall the app, then try again.'
            );
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
