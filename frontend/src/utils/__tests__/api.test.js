/**
 * Tests for src/utils/api.js
 *
 * Run:  npm test  (CRA / react-scripts test)
 *
 * Uses Jest + jsdom. window.location.hostname is overridden per test.
 */

/* ── helpers ──────────────────────────────────────────────────────────────── */

function setHostname(hostname) {
  delete window.location;
  window.location = { hostname };
}

function freshModule() {
  jest.resetModules();
  return require("../api.js");
}

function mockFetch(body, status = 200) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
  global.fetch = jest.fn().mockResolvedValue(response);
  return response;
}

/* ── API_BASE hostname detection ──────────────────────────────────────────── */

describe("API_BASE hostname detection", () => {
  afterEach(() => {
    jest.resetModules();
  });

  it("returns localhost URL for 'localhost'", () => {
    setHostname("localhost");
    const { API_BASE } = freshModule();
    expect(API_BASE).toBe("http://127.0.0.1:8000/api");
  });

  it("returns localhost URL for '127.0.0.1'", () => {
    setHostname("127.0.0.1");
    const { API_BASE } = freshModule();
    expect(API_BASE).toBe("http://127.0.0.1:8000/api");
  });

  it("returns LAN URL for 192.168.x.x", () => {
    setHostname("192.168.1.100");
    const { API_BASE } = freshModule();
    expect(API_BASE).toBe("http://192.168.1.100:8000/api");
  });

  it("returns LAN URL for 10.x.x.x", () => {
    setHostname("10.0.0.5");
    const { API_BASE } = freshModule();
    expect(API_BASE).toBe("http://10.0.0.5:8000/api");
  });

  it("returns LAN URL for 172.x.x.x", () => {
    setHostname("172.16.0.1");
    const { API_BASE } = freshModule();
    expect(API_BASE).toBe("http://172.16.0.1:8000/api");
  });

  it("returns ngrok URL for unknown hostnames", () => {
    setHostname("my-deploy.example.com");
    const { API_BASE } = freshModule();
    expect(API_BASE).toContain("ngrok");
  });
});

/* ── apiFetch ─────────────────────────────────────────────────────────────── */

describe("apiFetch", () => {
  let apiFetch;

  beforeEach(() => {
    setHostname("localhost");
    jest.resetModules();
    ({ apiFetch } = freshModule());
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("returns parsed JSON on success", async () => {
    mockFetch({ data: "ok" });
    const result = await apiFetch("/books");
    expect(result).toEqual({ data: "ok" });
  });

  it("calls fetch with Content-Type and Accept headers", async () => {
    mockFetch({});
    await apiFetch("/books");
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["Accept"]).toBe("application/json");
  });

  it("passes method and body through to fetch", async () => {
    mockFetch({});
    await apiFetch("/cart", { method: "POST", body: JSON.stringify({ id: 1 }) });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ id: 1 }));
  });

  it("merges extra headers without overwriting defaults", async () => {
    mockFetch({});
    await apiFetch("/user", { headers: { Authorization: "Bearer tok" } });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers["Authorization"]).toBe("Bearer tok");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("throws an Error when response is not ok", async () => {
    mockFetch({ message: "Unauthenticated" }, 401);
    await expect(apiFetch("/user")).rejects.toThrow("API error 401");
  });

  it("attaches response JSON to the thrown error", async () => {
    mockFetch({ message: "Not found" }, 404);
    try {
      await apiFetch("/books/9999");
    } catch (err) {
      expect(err.response).toEqual({ message: "Not found" });
    }
  });

  it("still throws even when error response JSON is not parseable", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockRejectedValue(new SyntaxError("invalid json")),
    });
    await expect(apiFetch("/crash")).rejects.toThrow("API error 500");
  });

  it("adds ngrok-skip-browser-warning header for ngrok base URL", async () => {
    setHostname("unknown.host.example");
    jest.resetModules();
    const { apiFetch: ngrokFetch } = freshModule();
    mockFetch({});
    await ngrokFetch("/books");
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers["ngrok-skip-browser-warning"]).toBe("true");
  });
});
