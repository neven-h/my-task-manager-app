// API Configuration - automatically uses correct URL based on environment
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://api.drpitz.club/api'
    : 'https://api.drpitz.club/api');

export default API_BASE;
