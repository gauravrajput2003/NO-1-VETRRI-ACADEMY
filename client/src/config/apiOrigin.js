// Keep the browser client on the same Render API as the mobile app.
export const PROD_API_ORIGIN = 'https://no-1-vetrri-academy.onrender.com';

const configuredOrigin = import.meta.env.VITE_API_ORIGIN?.trim().replace(/\/+$/, '');
export const API_ORIGIN = configuredOrigin || (import.meta.env.PROD ? PROD_API_ORIGIN : '');
export const API_BASE_URL = `${API_ORIGIN}/api`;
export const SOCKET_ORIGIN = import.meta.env.VITE_SOCKET_URL?.trim().replace(/\/+$/, '') || API_ORIGIN || window.location.origin;
