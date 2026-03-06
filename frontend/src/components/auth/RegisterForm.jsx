import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

const INITIAL = {
  username: "",
  email: "",
  password: "",
  password_confirmation: "",
  date_of_birth: "",
  gender: "",
};

export default function RegisterForm() {
  const { login } = useAuth();
  const [form, setForm]       = useState(INITIAL);
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const data = await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      login(data.user, data.token);
    } catch (err) {
      // Try to parse Laravel validation errors
      try {
        const body = await err.response?.json?.();
        if (body?.errors) {
          const flat = {};
          Object.entries(body.errors).forEach(([k, v]) => { flat[k] = v[0]; });
          setFieldErrors(flat);
        } else {
          setError(body?.message || "Registration failed. Please try again.");
        }
      } catch {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const field = (name, label, type = "text", placeholder = "") => (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <input
        className={`auth-input${fieldErrors[name] ? " auth-input--error" : ""}`}
        type={type}
        name={name}
        placeholder={placeholder}
        value={form[name]}
        onChange={handle}
        autoComplete={name}
      />
      {fieldErrors[name] && (
        <div className="auth-field-error">{fieldErrors[name]}</div>
      )}
    </div>
  );

  return (
    <form onSubmit={submit}>
      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      {field("username", "Username", "text", "e.g. chan_reads")}
      {field("email", "Email", "email", "you@example.com")}

      <div className="auth-field">
        <label className="auth-label">Password</label>
        <div className="auth-input-wrap">
          <input
            className={`auth-input${fieldErrors.password ? " auth-input--error" : ""}`}
            type={showPw ? "text" : "password"}
            name="password"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={handle}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password && (
          <div className="auth-field-error">{fieldErrors.password}</div>
        )}
      </div>

      <div className="auth-field">
        <label className="auth-label">Confirm Password</label>
        <input
          className={`auth-input${fieldErrors.password_confirmation ? " auth-input--error" : ""}`}
          type={showPw ? "text" : "password"}
          name="password_confirmation"
          placeholder="Repeat password"
          value={form.password_confirmation}
          onChange={handle}
          autoComplete="new-password"
        />
        {fieldErrors.password_confirmation && (
          <div className="auth-field-error">{fieldErrors.password_confirmation}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {field("date_of_birth", "Date of Birth", "date")}
        <div className="auth-field">
          <label className="auth-label">Gender</label>
          <select
            className="auth-input"
            name="gender"
            value={form.gender}
            onChange={handle}
          >
            <option value="">Select…</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}