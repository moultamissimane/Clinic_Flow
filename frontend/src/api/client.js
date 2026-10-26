// Thin fetch wrapper: attaches the JWT, serialises JSON, turns error payloads
// ({ error: { message, details } }) into ApiError.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'cf_token';

export class ApiError extends Error {
  constructor(status, message, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }

  // { fieldName: message } for form display.
  fieldErrors() {
    return Object.fromEntries(this.details.filter((d) => d.field).map((d) => [d.field, d.message]));
  }
}

// "Mémoriser ma session" → localStorage, otherwise the token dies with the tab.
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  set: (token, remember) => {
    tokenStore.clear();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que l’API est démarrée.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, data?.error?.message || `Erreur ${res.status}`, data?.error?.details || []);
  }
  return data;
}
