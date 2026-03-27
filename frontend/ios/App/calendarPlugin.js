// Capacitor wrapper for the native CalendarPlugin (EventKit / Apple Calendar)
// Falls back to ICS file share on web / non-native environments.

import { registerPlugin } from '@capacitor/core';
import { downloadICS } from '../../src/utils/generateICS';

const Calendar = registerPlugin('Calendar');

const isNative = () => !!(window.Capacitor?.isNativePlatform?.());

// Check current authorisation status without prompting.
// Returns { status: "authorized"|"writeOnly"|"denied"|"restricted"|"notDetermined" }
export async function checkCalendarAccess() {
    if (!isNative()) return { status: 'notDetermined' };
    try {
        return await Calendar.checkAccess();
    } catch (err) {
        console.error('Calendar.checkAccess failed (plugin bridge issue?):', err);
        return { status: 'notDetermined' };
    }
}

// Prompt the user for calendar access.
// Returns { granted: bool, status: string }
export async function requestCalendarAccess() {
    if (!isNative()) return { granted: false, status: 'notDetermined' };
    try {
        return await Calendar.requestAccess();
    } catch (err) {
        console.error('Calendar.requestAccess failed (plugin bridge issue?):', err);
        return { granted: false, status: 'denied' };
    }
}

// Add a task directly to Apple Calendar on native iOS.
// Falls back to ICS share-sheet on web / desktop.
export async function addTaskToCalendar(task) {
    if (!isNative()) {
        return downloadICS(task);
    }

    const allDay = !task.task_time;
    let startDate, endDate;

    if (allDay) {
        startDate = task.task_date;                  // "YYYY-MM-DD"
        endDate   = nextDayString(task.task_date);   // "YYYY-MM-DD"
    } else {
        const dur = parseFloat(task.duration) || 1;
        startDate = `${task.task_date}T${task.task_time.length === 5 ? task.task_time + ':00' : task.task_time}`;
        endDate   = addHoursISO(task.task_date, task.task_time, dur);
    }

    let notes = task.description || '';
    if (task.notes) notes += (notes ? '\n\nNotes: ' : 'Notes: ') + task.notes;

    return Calendar.addEvent({
        title:    task.title    || 'Task',
        startDate,
        endDate,
        allDay,
        notes:    notes    || undefined,
        location: task.client || undefined,
    });
}

// --- date helpers ---

function nextDayString(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function addHoursISO(dateStr, timeStr, hours) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m + Math.round(hours * 60);
    const overDays = Math.floor(totalMin / (24 * 60));
    const newH = Math.floor(totalMin / 60) % 24;
    const newM = totalMin % 60;
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + overDays);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(newH)}:${pad(newM)}:00`;
}
