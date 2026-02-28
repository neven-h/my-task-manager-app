/**
 * Basic URL sanitizer to prevent dangerous schemes (e.g., javascript:, data:).
 * Allows only http:, https:, and relative URLs.
 */
const sanitizeUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return '#';
    }
    const trimmed = url.trim();
    if (trimmed === '') {
        return '#';
    }
    // Allow relative URLs (they inherit the current origin)
    if (trimmed.startsWith('/')) {
        return trimmed;
    }
    try {
        const parsed = new URL(trimmed, window.location.origin);
        const protocol = (parsed.protocol || '').toLowerCase();
        if (protocol === 'http:' || protocol === 'https:') {
            return parsed.toString();
        }
        // Disallow other protocols such as javascript:, data:, etc.
        return '#';
    } catch (e) {
        // If URL parsing fails, fall back to a safe placeholder
        return '#';
    }
};

export default sanitizeUrl;
