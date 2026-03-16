/**
 * Returns a human-readable relative time string like "just now", "3 min ago", "1 hr ago".
 * @param {Date|null} date
 * @returns {string|null}
 */
const relativeTime = (date) => {
    if (!date) return null;
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
};

export default relativeTime;
