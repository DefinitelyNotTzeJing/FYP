const hostname = window.location.hostname;

export const API_BASE = 
  hostname === "localhost"
    ? "http://127.0.0.1:8000/api"
    : hostname === "192.168.0.223"
    ? "http://192.168.0.223:8000/api"
    : "https://lacey-nondisinterested-noninclusively.ngrok-free.dev/api";

export async function apiFetch(endpoint, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...extraHeaders,
    },
  });

  if (!res.ok) {
    const err = new Error(`API error ${res.status}`);
    try { err.response = await res.json(); } catch { }
    throw err;
  }

  return res.json();
}