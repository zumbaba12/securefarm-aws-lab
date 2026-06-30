// Tiny fetch wrapper. Reads the bearer token from localStorage.
const TOKEN_KEY = 'securefarm_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return body;
}

// Multipart upload helper. Lets the browser set the multipart content-type
// (with boundary) itself; we only attach the bearer token.
export async function apiUpload(path, file) {
  const headers = {};
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(path, { method: 'POST', body: form, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && body.error) || `Upload failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return body;
}
