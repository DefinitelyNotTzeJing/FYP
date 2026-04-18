function getApiBase() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000/api";
  }
  if (/^192\.168\.|^10\.|^172\./.test(host)) {
    return `http://${host}:8000/api`;
  }
  return "https://lacey-nondisinterested-noninclusively.ngrok-free.dev/api";
}

export const API_BASE = getApiBase();

export async function apiFetch(endpoint, options = {}) {
  const { headers: extraHeaders, ...restOptions } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(API_BASE.includes("ngrok") && { "ngrok-skip-browser-warning": "true" }),
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
