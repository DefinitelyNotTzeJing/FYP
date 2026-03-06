import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

export default function LoginForm({ onForgotPassword, onFaceLogin }) {
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.user, data.token);
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <div className="auth-field">
        <label className="auth-label">Email</label>
        <input
          className="auth-input"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handle}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">Password</label>
        <div className="auth-input-wrap">
          <input
            className="auth-input"
            type={showPw ? "text" : "password"}
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handle}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "right", marginBottom: "1.25rem", marginTop: "-0.5rem" }}>
        <button type="button" className="auth-link-btn" onClick={onForgotPassword}>
          Forgot password?
        </button>
      </div>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <div className="auth-divider">or</div>

      <button type="button" className="auth-face-btn" onClick={onFaceLogin}>
        👤 Sign in with Face Recognition
      </button>
    </form>
  );
}