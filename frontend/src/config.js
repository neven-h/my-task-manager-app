// API Configuration - automatically uses correct URL based on environment
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://api.drpitz.club/api'  // Production API URL
    : 'http://localhost:5001/api');   // Local development

export default API_BASE;
