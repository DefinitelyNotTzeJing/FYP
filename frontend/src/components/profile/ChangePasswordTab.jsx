import { useState } from "react";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function ChangePasswordTab() {
  const { token, logout } = useAuth();
  const [form, setForm]   = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setAlert({ type: "error", msg: "New passwords do not match." });
      return;
    }
    setAlert(null);
    setLoading(true);
    try {
      await apiFetch("/password/change", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      setAlert({ type: "success", msg: "Password changed. You will be signed out." });
      setTimeout(() => logout(), 2000);
    } catch {
      setAlert({ type: "error", msg: "Current password is incorrect." });
    } finally {
      setLoading(false);
    }
  }

  const pwField = (name, label, placeholder) => (
    <div className="profile-field">
      <label className="profile-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="profile-input"
          type={showPw ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={form[name]}
          onChange={handle}
          required
          style={{ paddingRight: "3rem" }}
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          style={{
            position: "absolute", right: "0.75rem", top: "50%",
            transform: "translateY(-50%)", background: "none",
            border: "none", fontSize: "0.82rem", color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          {showPw ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );

  return (
    <form className="change-pw-form profile-form" onSubmit={submit}>
      {alert && (
        <div className={`profile-alert profile-alert--${alert.type}`}>
          {alert.msg}
        </div>
      )}
      {pwField("current_password",      "Current Password",  "Enter current password")}
      {pwField("password",              "New Password",      "Min. 8 characters")}
      {pwField("password_confirmation", "Confirm New Password", "Repeat new password")}

      <div className="profile-form__actions">
        <button className="profile-btn-save" type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update Password"}
        </button>
      </div>
    </form>
  );
}