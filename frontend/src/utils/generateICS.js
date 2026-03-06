const pad = (n) => String(n).padStart(2, '0');

function nowStamp() {
    const d = new Date();
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function formatDate(dateStr) {
    return dateStr.replace(/-/g, '');
}

function formatDateTime(dateStr, timeStr) {
    const date = formatDate(dateStr);
    const parts = timeStr.split(':');
    return `${date}T${pad(parts[0])}${pad(parts[1])}${pad(parts[2] || '00')}`;
}

function addHoursToDateTime(dateStr, timeStr, hours) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = h * 60 + m + Math.round(parseFloat(hours) * 60);
    const overflowDays = Math.floor(totalMinutes / (24 * 60));
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + overflowDays);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(newH)}${pad(newM)}00`;
}

function nextDay(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeICS(str) {
    return String(str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

export function generateICS(task) {
    const uid = `${task.id}-taskmanager@drpitz.club`;
    const dtstamp = nowStamp();

    let dtstart, dtend, allDay;
    if (task.task_time) {
        allDay = false;
        dtstart = formatDateTime(task.task_date, task.task_time);
        dtend = addHoursToDateTime(task.task_date, task.task_time, task.duration || 1);
    } else {
        allDay = true;
        dtstart = formatDate(task.task_date);
        dtend = nextDay(task.task_date);
    }

    let desc = task.description || '';
    if (task.notes) desc += (desc ? '\n\nNotes: ' : 'Notes: ') + task.notes;

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Task Manager//drpitz.club//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        allDay ? `DTSTART;VALUE=DATE:${dtstart}` : `DTSTART:${dtstart}`,
        allDay ? `DTEND;VALUE=DATE:${dtend}` : `DTEND:${dtend}`,
        `SUMMARY:${escapeICS(task.title)}`,
    ];

    if (desc) lines.push(`DESCRIPTION:${escapeICS(desc)}`);
    if (task.client) lines.push(`LOCATION:${escapeICS(task.client)}`);

    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
}

export function downloadICS(task) {
    const ics = generateICS(task);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
