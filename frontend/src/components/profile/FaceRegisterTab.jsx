import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, API_BASE } from "../../utils/api";

const CHALLENGES = [
  { type: "turn_left",  instruction: "Turn your head LEFT",  arrow: "⬅️", hint: "Slowly rotate your head to the left" },
  { type: "turn_right", instruction: "Turn your head RIGHT", arrow: "➡️", hint: "Slowly rotate your head to the right" },
];

const CAPTURE_DURATION_MS = 5000;
const CAPTURE_INTERVAL_MS = 250;
const POSE_CHECK_INTERVAL = 400;

export default function FaceRegisterTab() {
  const { token } = useAuth();

  const [step, setStep]               = useState("idle");
  const [challenge, setChallenge]     = useState(null);
  const [countdown, setCountdown]     = useState(3);
  const [progress, setProgress]       = useState(0);
  const [camReady, setCamReady]       = useState(false);
  const [error, setError]             = useState(null);
  const [challengeDone, setChallengeDone] = useState(false);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const framesRef    = useRef([]);
  const timerRef     = useRef(null);
  const challengeRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => { challengeRef.current = challenge; }, [challenge]);

  useEffect(() => {
    if (step !== "challenge") return;
    capturingRef.current = false;
    setChallengeDone(false);

    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCamReady(true);
        }
      })
      .catch(() => {
        setError("Could not access camera. Please allow camera permissions.");
        setStep("idle");
      });
  }, [step]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    clearInterval(timerRef.current);
    setCamReady(false);
  }

  function captureFrame() {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  }

  function startCapturing() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    framesRef.current = [];
    setStep("capturing");
    setProgress(0);

    let lastPoseCheck = 0;

    const start = Date.now();
    timerRef.current = setInterval(async () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / CAPTURE_DURATION_MS) * 100));

      const frame = captureFrame();
      if (frame) {
        framesRef.current.push(frame);

        if (elapsed - lastPoseCheck >= POSE_CHECK_INTERVAL) {
          lastPoseCheck = elapsed;
          try {
            const res = await fetch(`${API_BASE}/face/check-pose`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Accept": "application/json" },
              body: JSON.stringify({ frame }),
            });
            const data = await res.json();
            if (data.has_pose) {
              const c = challengeRef.current;
              if (c?.type === "turn_left"  && data.yaw > 5)   setChallengeDone(true);
              if (c?.type === "turn_right" && data.yaw < -5)  setChallengeDone(true);
              if (c?.type === "look_up"    && data.pitch < -5) setChallengeDone(true);
              if (c?.type === "look_down"  && data.pitch > 5)  setChallengeDone(true);
            }
          } catch (_) { /* non-fatal */ }
        }
      }

      if (elapsed >= CAPTURE_DURATION_MS) {
        clearInterval(timerRef.current);
        stopCamera();
        submitRegistration(framesRef.current, challengeRef.current);
      }
    }, CAPTURE_INTERVAL_MS);
  }

  async function submitRegistration(frames, currentChallenge) {
    setStep("submitting");
    setError(null);
    try {
      await apiFetch("/face/register", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ frames, challenge_type: currentChallenge.type }),
      });
      setStep("done");
    } catch (e) {
      const msg = e?.response?.message || "Registration failed. Please try again in good lighting.";
      setError(msg);
      setStep("idle");
    }
  }

  useEffect(() => {
    if (step !== "challenge") return;
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(id); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === "challenge" && countdown === 0 && camReady) startCapturing();
  }, [countdown, camReady, step]); // eslint-disable-line

  // ── Render ────────────────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Face registered successfully!
        </div>
        <div style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
          You can now use face recognition to log in to your account.
        </div>
        <button
          onClick={() => { setStep("idle"); setError(null); }}
          style={{ padding: "0.55rem 1.25rem", background: "none", border: "1.5px solid var(--border)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "0.88rem" }}
        >
          Register Again
        </button>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔍</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>Processing your face…</div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>Running liveness check and saving your face data</div>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "1.5rem 0" }}>
        <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.75rem" }}>
          <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "1rem" }}>🪪</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600, textAlign: "center", marginBottom: "0.5rem" }}>
            Face Recognition Login
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Register your face to enable quick, password-free login. You'll be given a short liveness challenge to prevent photo spoofing.
          </div>

          {error && (
            <div style={{ fontSize: "0.82rem", color: "#c0392b", background: "#fef2f2", border: "1px solid #fecaca", padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
              ❌ {error}
            </div>
          )}

          <div style={{ background: "var(--paper-dark)", borderRadius: "8px", padding: "1rem", marginBottom: "1.25rem", fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.4rem", fontSize: "0.85rem" }}>How it works:</div>
            <div>1️⃣ &nbsp;Camera opens — position your face in the ring</div>
            <div>2️⃣ &nbsp;A 3-second countdown begins</div>
            <div>3️⃣ &nbsp;Follow the on-screen direction (e.g. turn left)</div>
            <div>4️⃣ &nbsp;Hold the pose for a moment, then return to center</div>
            <div>5️⃣ &nbsp;Wait for confirmation ✅</div>
          </div>

          <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
            <div style={{ marginBottom: "0.4rem" }}>✓ &nbsp;Liveness detection prevents photo spoofing</div>
            <div style={{ marginBottom: "0.4rem" }}>✓ &nbsp;Your face data is stored securely</div>
            <div>✓ &nbsp;Can be re-registered at any time</div>
          </div>

          <button
            onClick={() => {
              const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
              setChallenge(c);
              challengeRef.current = c;
              setError(null);
              setStep("challenge");
            }}
            style={{ width: "100%", padding: "0.75rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.95rem", fontWeight: 500, cursor: "pointer" }}
          >
            📷 &nbsp;Open Camera to Register
          </button>
        </div>
      </div>
    );
  }

  const isCapturing = step === "capturing";

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "1.5rem 0" }}>
      <button
        onClick={() => { stopCamera(); setStep("idle"); setError(null); }}
        style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.88rem", marginBottom: "1rem" }}
      >
        ← Cancel
      </button>

      {error && (
        <div style={{ fontSize: "0.82rem", color: "#c0392b", background: "#fef2f2", border: "1px solid #fecaca", padding: "0.5rem 0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {challenge && (
        <div style={{
          textAlign: "center", padding: "0.75rem 1rem", marginBottom: "0.75rem",
          background: challengeDone ? "#f0fdf4" : "var(--paper-dark)",
          border: challengeDone ? "1.5px solid #86efac" : "1.5px solid transparent",
          borderRadius: "8px", transition: "all 0.3s",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>{challenge.arrow}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600 }}>
            {challengeDone ? "Challenge done! ✅" : challenge.instruction}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
            {!isCapturing && "Get ready…"}
            {isCapturing && !challengeDone && challenge.hint}
            {isCapturing && challengeDone && "Hold still until the bar fills"}
          </div>
        </div>
      )}

      <div className="camera-wrap">
        <video ref={videoRef} muted playsInline style={{ transform: "scaleX(-1)" }} />
        <div className="camera-overlay"><div className="camera-ring" /></div>

        {step === "challenge" && countdown > 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: "4.5rem", fontWeight: 700, color: "white", lineHeight: 1 }}>{countdown}</div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
              Get ready to {challenge?.instruction?.toLowerCase()}
            </div>
          </div>
        )}

        {isCapturing && (
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
            <div style={{
              background: challengeDone ? "rgba(22,163,74,0.85)" : "rgba(0,0,0,0.6)",
              color: "white", padding: "0.3rem 0.9rem", borderRadius: "20px",
              fontSize: "0.82rem", fontWeight: 600, transition: "background 0.3s",
            }}>
              {challengeDone ? `✅ ${challenge?.instruction} — done!` : `${challenge?.arrow} ${challenge?.instruction}`}
            </div>
          </div>
        )}
      </div>

      {isCapturing && (
        <div style={{ margin: "0.75rem 0 0.25rem", background: "var(--border)", borderRadius: "4px", overflow: "hidden", height: 7 }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: challengeDone ? "#22c55e" : "var(--accent)",
            transition: "width 0.1s linear, background 0.3s",
          }} />
        </div>
      )}

      <p className="camera-hint" style={{ textAlign: "center", marginTop: "0.5rem" }}>
        {isCapturing && !challengeDone && challenge?.hint}
        {isCapturing && challengeDone && "Hold still — almost done!"}
        {!isCapturing && countdown > 0 && `Starting in ${countdown}…`}
        {!isCapturing && countdown === 0 && "Capturing…"}
      </p>
    </div>
  );
}