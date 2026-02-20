/**
 * Shared API utilities — centralises auth header injection.
 * Import getAuthHeaders() in every component that makes fetch calls.
 */
import storage, { STORAGE_KEYS } from './utils/storage';

/**
 * Returns headers with Authorization Bearer token + Content-Type.
 * Safe to use for JSON requests.  For multipart/form-data (file uploads)
 * omit Content-Type so the browser sets the correct boundary.
 * @param {boolean} [contentType=true] - include Content-Type: application/json
 */
export const getAuthHeaders = (contentType = true) => {
  const token = storage.get(STORAGE_KEYS.AUTH_TOKEN);
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};
