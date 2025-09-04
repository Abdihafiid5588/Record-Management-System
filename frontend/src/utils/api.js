// src/utils/api.js
export const API_URL = import.meta.env.VITE_API_BASE_URL || '';

export const buildApiUrl = (path) => {
  const base = API_URL.replace(/\/+$/, ''); // remove trailing slash(es)
  let p = path.startsWith('/') ? path : `/${path}`;

  // If base already ends with '/api' and path starts with '/api', remove the duplicate.
  if (base.toLowerCase().endsWith('/api') && p.toLowerCase().startsWith('/api')) {
    p = p.replace(/^\/api/i, '');
  }

  return `${base}${p}`;
};
