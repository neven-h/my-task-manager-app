// Capacitor wrapper for the native CalendarPlugin (EventKit / Apple Calendar).
// Must live inside src/ so Vite can resolve it.

let _plugin = null;

function getPlugin() {
    if (_plugin) return _plugin;
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    try {
        _plugin = window.Capacitor.registerPlugin('Calendar');
        return _plugin;
    } catch {
        return null;
    }
}

const pad = (n) => String(n).padStart(2, '0');

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
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(newH)}:${pad(newM)}:00`;
}

export async function addTaskToNativeCalendar(task) {
    const plugin = getPlugin();
    if (!plugin) throw new Error('Calendar plugin not available');

    let status = (await plugin.checkAccess())?.status;
    if (!['authorized', 'fullAccess', 'writeOnly'].includes(status)) {
        const requested = await plugin.requestAccess();
        status = requested?.status;
        if (!requested?.granted && !['authorized', 'fullAccess', 'writeOnly'].includes(status)) {
            throw new Error('Calendar access was not granted');
        }
    }

    const allDay = !task.task_time;
    const startDate = allDay
        ? task.task_date
        : `${task.task_date}T${task.task_time.length === 5 ? task.task_time + ':00' : task.task_time}`;
    const endDate = allDay
        ? nextDayString(task.task_date)
        : addHoursISO(task.task_date, task.task_time, parseFloat(task.duration) || 1);

    let notes = task.description || '';
    if (task.notes) notes += (notes ? '\n\nNotes: ' : 'Notes: ') + task.notes;

    return plugin.addEvent({
        title: task.title || 'Task',
        startDate,
        endDate,
        allDay,
        notes: notes || undefined,
        location: task.client || undefined,
    });
}
