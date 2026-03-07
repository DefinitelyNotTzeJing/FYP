import { useState, useEffect } from "react";

export default function EditProfileTab({ profile, onSave, pendingImage }) {
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]     = useState(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      username:          profile.user?.username          || "",
      phone:             profile.profile?.phone          || "",
      address:           profile.profile?.address        || "",
      date_of_birth:     profile.profile?.date_of_birth
                           ? profile.profile.date_of_birth.slice(0, 10)
                           : "",
      gender:            profile.profile?.gender         || "",
      payment_method:    profile.profile?.payment_method || "",
      profile_image_base64: profile.profile?.profile_image_base64 || "",
    });
  }, [profile]);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      await onSave(form);
      setAlert({ type: "success", msg: "Profile updated successfully." });
    } catch {
      setAlert({ type: "error", msg: "Failed to update profile. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const field = (name, label, type = "text", placeholder = "") => (
    <div className="profile-field">
      <label className="profile-label">{label}</label>
      <input
        className="profile-input"
        type={type}
        name={name}
        placeholder={placeholder}
        value={form[name] || ""}
        onChange={handle}
      />
    </div>
  );

  return (
    <form className="profile-form" onSubmit={submit}>
      {alert && (
        <div className={`profile-alert profile-alert--${alert.type}`}>
          {alert.msg}
        </div>
      )}

      {/* Show pending image notice */}
      {pendingImage && (
        <div className="profile-alert profile-alert--success" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img
            src={pendingImage}
            alt="preview"
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          New photo selected — click Save Changes to apply it.
        </div>
      )}

      <div className="profile-form__grid">
        {field("username",      "Username",      "text", "e.g. chan_reads")}
        {field("phone",         "Phone",         "tel",  "+60 12-345 6789")}
        {field("date_of_birth", "Date of Birth", "date")}
        <div className="profile-field">
          <label className="profile-label">Gender</label>
          <select
            className="profile-input"
            name="gender"
            value={form.gender || ""}
            onChange={handle}
          >
            <option value="">Select…</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {field("payment_method", "Preferred Payment Method", "text", "e.g. Credit Card")}

      <div className="profile-field">
        <label className="profile-label">Address</label>
        <textarea
          className="profile-input"
          name="address"
          rows={3}
          placeholder="Your delivery address"
          value={form.address || ""}
          onChange={handle}
          style={{ resize: "vertical" }}
        />
      </div>

      <div className="profile-form__actions">
        <button className="profile-btn-save" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}