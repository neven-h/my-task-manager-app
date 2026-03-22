export const SYS = {
    primary: '#0000FF',
    accent: '#FF0000',
    success: '#00AA00',
    bg: '#fff',
    text: '#000',
    light: '#666',
    border: '#000',
    borderLight: '#ddd',
};

export const STATUS_COLORS = {
    planned: '#0000FF',
    in_progress: '#FF8800',
    done: '#00AA00',
};

export const STATUS_LABELS = {
    planned: 'Planned',
    in_progress: 'In Progress',
    done: 'Done',
};

export const fmt = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.abs(n ?? 0));

export const fmtDec = (n) =>
    new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n ?? 0));

export const today = () => new Date().toISOString().split('T')[0];
