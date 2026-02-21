/**
 * Central API configuration
 * All components must import from here — never hardcode localhost URLs.
 *
 * Set VITE_API_URL in .env (or .env.production) to point at your backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_URL = `${API_BASE_URL}/api`;

export default API_BASE_URL;
