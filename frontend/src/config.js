// API Configuration - automatically uses correct URL based on environment
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://my-task-manager-app-production.up.railway.app/api'
    : 'https://my-task-manager-app-production.up.railway.app/api');

export default API_BASE;
