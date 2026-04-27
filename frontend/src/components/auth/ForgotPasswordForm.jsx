import { useState, useRef } from "react";
import { apiFetch } from "../../utils/api";

// Step 1 — enter email
function StepEmail({ onNext }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      onNext(email);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 422 || e?.response?.errors?.email) {
        setError("No account found with that email address.");
      } else {
        setError("Failed to send OTP. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        Enter your email and we'll send a 6-digit OTP to reset your password.
      </p>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <div className="auth-field">
        <label className="auth-label">Email Address</label>
        <input
          className="auth-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send OTP"}
      </button>
    </form>
  );
}

// Step 2 — enter 6-digit OTP
function StepOtp({ email, onNext }) {
  const [otp, setOtp]         = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const inputs = useRef([]);

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  async function submit(e) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch("/password/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: code }),
      });
      onNext(data.token);
    } catch {
      setError("Invalid or expired OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        We sent a 6-digit code to <strong>{email}</strong>. Enter it below.
      </p>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            autoFocus={i === 0}
            style={{
              width: "2.75rem", height: "3rem",
              textAlign: "center", fontSize: "1.25rem", fontWeight: 600,
              border: "1.5px solid var(--border)", borderRadius: "8px",
              background: "var(--white)", fontFamily: "var(--font-body)",
              outline: "none", caretColor: "var(--accent)",
            }}
          />
        ))}
      </div>
      <button
        className="auth-submit"
        type="submit"
        disabled={loading || otp.join("").length < 6}
      >
        {loading ? "Verifying…" : "Verify OTP"}
      </button>
    </form>
  );
}

// Step 3 — set new password
function StepNewPassword({ email, token, onSuccess }) {
  const [form, setForm]       = useState({ password: "", password_confirmation: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/password/reset", {
        method: "POST",
        body: JSON.stringify({ email, token, ...form }),
      });
      onSuccess();
    } catch {
      setError("Failed to reset password. Please start over.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        Choose a new password for your account.
      </p>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      <div className="auth-field">
        <label className="auth-label">New Password</label>
        <div className="auth-input-wrap">
          <input
            className="auth-input"
            type={showPw ? "text" : "password"}
            name="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={handle}
            required
          />
          <button type="button" className="auth-input-toggle" onClick={() => setShowPw((v) => !v)}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div className="auth-field">
        <label className="auth-label">Confirm New Password</label>
        <input
          className="auth-input"
          type={showPw ? "text" : "password"}
          name="password_confirmation"
          placeholder="Repeat password"
          value={form.password_confirmation}
          onChange={handle}
          required
        />
      </div>
      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  );
}

// Orchestrator
export default function ForgotPasswordForm({ onBack, onSuccess }) {
  const [step, setStep]   = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  if (step === 1) {
    return (
      <>
        <button className="auth-back" onClick={onBack}>← Back to login</button>
        <StepEmail onNext={(e) => { setEmail(e); setStep(2); }} />
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <button className="auth-back" onClick={() => setStep(1)}>← Change email</button>
        <StepOtp email={email} onNext={(t) => { setToken(t); setStep(3); }} />
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <StepNewPassword
          email={email}
          token={token}
          onSuccess={onSuccess}
        />
      </>
    );
  }
}