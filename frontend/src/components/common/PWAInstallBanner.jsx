import { useState } from "react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

export default function PWAInstallBanner() {
  const { isMobile, isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  // Only show on mobile, not installed, not dismissed
  if (!isMobile || isInstalled || dismissed) return null;

  // Android Chrome — native prompt available
  if (isInstallable) {
    return (
      <div style={styles.banner}>
        <span style={styles.icon}>📚</span>
        <div style={styles.text}>
          <div style={styles.title}>Add Folio to your home screen</div>
        </div>
        <button style={styles.btn} onClick={promptInstall}>Install</button>
        <button style={styles.close} onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  // iOS Safari — no native prompt, show manual instructions
  if (isIOS) {
    return (
      <div style={{ ...styles.banner, flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}>
        <div style={{ display: "flex", width: "100%", alignItems: "center", gap: "0.6rem" }}>
          <span style={styles.icon}>📚</span>
          <div style={styles.text}>
            <div style={styles.title}>Add Folio to your home screen</div>
          </div>
          <button style={styles.close} onClick={() => setDismissed(true)}>✕</button>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", paddingLeft: "0.25rem" }}>
          Tap <strong>Share</strong> <span style={{ fontSize: "1rem" }}>⎙</span> then <strong>"Add to Home Screen"</strong>
        </div>
      </div>
    );
  }

  // Desktop or unsupported — show nothing
  return null;
}

const styles = {
  banner: {
    position: "fixed",
    bottom: "1rem",
    left: "1rem",
    right: "1rem",
    zIndex: 9999,
    background: "var(--white)",
    border: "1.5px solid var(--border)",
    borderRadius: "14px",
    padding: "0.85rem 1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  },
  icon: {
    fontSize: "1.6rem",
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "0.88rem",
    color: "var(--ink)",
  },
  sub: {
    fontSize: "0.75rem",
    color: "var(--muted)",
    marginTop: "0.1rem",
  },
  btn: {
    padding: "0.45rem 1rem",
    background: "var(--ink)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontFamily: "var(--font-body)",
    fontSize: "0.83rem",
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  close: {
    background: "none",
    border: "none",
    fontSize: "0.85rem",
    color: "var(--muted)",
    cursor: "pointer",
    padding: "0.25rem",
    flexShrink: 0,
  },
};