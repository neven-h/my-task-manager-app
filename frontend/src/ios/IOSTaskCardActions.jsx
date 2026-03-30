import React from 'react';
import { Edit2, Copy, Share2, CalendarPlus } from 'lucide-react';
import { THEME } from './theme';
import { addTaskToCalendar, checkCalendarAccess, requestCalendarAccess } from '../../ios/App/calendarPlugin';
import { downloadICS } from '../utils/generateICS';

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

const ALLOWED = new Set(['authorized', 'fullAccess', 'writeOnly']);
const calendarAllowed = (s) => ALLOWED.has(s);

async function handleAddToCalendar(task) {
    // Non-native (web/desktop): ICS download is the right path
    if (!isNative()) {
        await addTaskToCalendar(task);
        return;
    }

    // --- Native iOS path ---
    let { status } = await checkCalendarAccess();

    // Plugin bridge is not reachable — fall through to ICS share sheet
    if (status === 'bridgeFailed') {
        await downloadICS(task);
        return;
    }

    // User explicitly blocked access — tell them how to re-enable
    if (status === 'denied' || status === 'restricted') {
        alert(
            'Calendar access is blocked.\n\n' +
            'To allow it: Settings → Dr. Pitz Club → Calendars\n' +
            '(or Settings → Privacy & Security → Calendars).'
        );
        return;
    }

    // First run — request permission
    if (!calendarAllowed(status)) {
        const result = await requestCalendarAccess();
        status = result.status;

        // Bridge failed during request — fall back to share sheet silently
        if (status === 'bridgeFailed') {
            await downloadICS(task);
            return;
        }

        // User declined the permission prompt
        if (!result.granted && !calendarAllowed(status)) {
            alert(
                'Calendar permission was not granted.\n\n' +
                'You can enable it later under Settings → Dr. Pitz Club → Calendars.\n\n' +
                'Alternatively the event will be shared as a file you can open in Calendar.'
            );
            // Fallback: share ICS so the user can still add the event
            try { await downloadICS(task); } catch (_) { /* ignore */ }
            return;
        }
    }

    // Permission is in place — add directly via native plugin
    try {
        await addTaskToCalendar(task);
        alert('Task added to your calendar!');
    } catch (err) {
        console.error('Calendar addEvent failed:', err);
        // Native plugin failed mid-way — offer ICS share as a reliable fallback
        try {
            await downloadICS(task);
        } catch (shareErr) {
            alert('Could not add event to calendar.\n' + (err?.message || err));
        }
    }
}

const IOSTaskCardActions = ({ task, openEditTaskForm, duplicateTask, openShareModal }) => (
    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        <button type="button" onClick={() => openEditTaskForm(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Edit task">
            <Edit2 size={18} color="#8E8E93" />
        </button>
        <button type="button" onClick={() => duplicateTask(task.id)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Duplicate task">
            <Copy size={18} color="#8E8E93" />
        </button>
        <button type="button" onClick={() => openShareModal(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Share task">
            <Share2 size={18} color="#8E8E93" />
        </button>
        <button type="button" onClick={() => handleAddToCalendar(task)} style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', borderRadius: 8 }} aria-label="Add to Apple Calendar">
            <CalendarPlus size={18} color={THEME.accent} />
        </button>
    </div>
);

export default IOSTaskCardActions;
