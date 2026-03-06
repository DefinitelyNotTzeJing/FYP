export const API_BASE = "http://127.0.0.1:8000/api";

export async function apiFetch(endpoint, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
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