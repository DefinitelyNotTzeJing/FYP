/**
 * Tests for src/context/AuthContext.jsx
 *
 * Run: npm test
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

// Minimal consumer that exposes context values via data-testid attributes
function TestConsumer() {
  const { user, token, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : "null"}</span>
      <span data-testid="token">{token ?? "null"}</span>
      <button onClick={() => login({ email: "a@b.com" }, "tok-123")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function okFetch(body) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
  });
}

function errorFetch(status = 401) {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockResolvedValue({}),
  });
}

// ── Setup / teardown ───────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("AuthProvider – initial state with no token", () => {
  it("starts in loading state then becomes not-loading", async () => {
    global.fetch = okFetch({});
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
    expect(screen.getByTestId("token").textContent).toBe("null");
  });

  it("does not call /user when no token in localStorage", async () => {
    global.fetch = jest.fn();
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("AuthProvider – initializes from localStorage token", () => {
  it("fetches /user when a token exists in localStorage", async () => {
    localStorage.setItem("token", "saved-token");
    global.fetch = okFetch({ user: { email: "stored@test.com" } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("stored@test.com")
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/user$/);
  });

  it("clears token when /user returns a non-ok response", async () => {
    localStorage.setItem("token", "bad-token");
    global.fetch = errorFetch(401);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("login()", () => {
  it("sets the user and token in context", async () => {
    // After login(), token state changes → useEffect fetches /user again
    global.fetch = okFetch({ user: { email: "a@b.com" } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    act(() => {
      screen.getByText("login").click();
    });

    // login() sets user directly without waiting for fetch,
    // then useEffect re-fetches and may override — wait for stabilization
    await waitFor(() =>
      expect(screen.getByTestId("token").textContent).toBe("tok-123")
    );
    expect(screen.getByTestId("user").textContent).toBe("a@b.com");
  });

  it("persists token to localStorage", async () => {
    global.fetch = okFetch({ user: { email: "a@b.com" } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false")
    );

    act(() => {
      screen.getByText("login").click();
    });

    await waitFor(() =>
      expect(localStorage.getItem("token")).toBe("tok-123")
    );
  });
});

describe("logout()", () => {
  it("clears user, token, and localStorage", async () => {
    localStorage.setItem("token", "existing-tok");
    // first call: /user init; second call: /logout POST
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { email: "me@test.com" } }),
      })
      .mockResolvedValue({ ok: true });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("me@test.com")
    );

    act(() => {
      screen.getByText("logout").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("null")
    );
    expect(screen.getByTestId("token").textContent).toBe("null");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("calls the /logout API endpoint when a token exists", async () => {
    localStorage.setItem("token", "active-tok");
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { email: "u@test.com" } }),
      })
      .mockResolvedValue({ ok: true });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("u@test.com")
    );

    act(() => {
      screen.getByText("logout").click();
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [logoutUrl, opts] = global.fetch.mock.calls[1];
    expect(logoutUrl).toMatch(/\/logout$/);
    expect(opts.method).toBe("POST");
  });
});
