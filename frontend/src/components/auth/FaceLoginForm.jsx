import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch, API_BASE } from "../../utils/api";

const CHALLENGES = [
  { type: "turn_left",  instruction: "Rotate your head",  arrow: "↔️", hint: "Slowly rotate your head left or right" },
  { type: "turn_right", instruction: "Rotate your head",  arrow: "↔️", hint: "Slowly rotate your head left or right" },
];

const CAPTURE_DURATION_MS = 5000;
const CAPTURE_INTERVAL_MS = 250;
const POSE_CHECK_INTERVAL = 400;

export default function FaceLoginForm({ onBack }) {
  const { login } = useAuth();

  const [email, setEmail]             = useState("");
  const [step, setStep]               = useState("email");
  const [challenge, setChallenge]     = useState(null);
  const [countdown, setCountdown]     = useState(3);
  const [progress, setProgress]       = useState(0);
  const [error, setError]             = useState(null);
  const [camReady, setCamReady]       = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);
  const [poseMsg, setPoseMsg]             = useState("");

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const framesRef    = useRef([]);
  const timerRef     = useRef(null);
  const emailRef     = useRef("");
  const challengeRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { challengeRef.current = challenge; }, [challenge]);

  useEffect(() => {
    if (step !== "challenge") return;
    capturingRef.current = false;
setChallengeDone(false);
    setPoseMsg("");

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
        setStep("email");
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
    const yawHistory = [];

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
              if (c?.type === "turn_left" || c?.type === "turn_right") {
                yawHistory.push(data.yaw);
                if (yawHistory.length >= 3) {
                  const sorted = [...yawHistory].sort((a, b) => a - b);
                  const median = sorted[Math.floor(sorted.length / 2)];
                  const deviation = Math.abs(data.yaw - median);
                  const needed = 3;
                  if (deviation >= needed) {
                    setChallengeDone(true);
                    setPoseMsg(`✅ Head rotated ${deviation.toFixed(1)}° — great!`);
                  } else {
                    setPoseMsg(`Keep rotating… ${deviation.toFixed(1)}° / ${needed}°`);
                  }
                }
              }
              if (c?.type === "look_up"   && data.pitch < -3) { setChallengeDone(true); setPoseMsg("✅ Looking up — great!"); }
              if (c?.type === "look_down" && data.pitch > 3)  { setChallengeDone(true); setPoseMsg("✅ Looking down — great!"); }
            }
          } catch (_) { /* non-fatal */ }
        }
      }

      if (elapsed >= CAPTURE_DURATION_MS) {
        clearInterval(timerRef.current);
        stopCamera();
        submitVerification(framesRef.current, emailRef.current, challengeRef.current);
      }
    }, CAPTURE_INTERVAL_MS);
  }

  async function submitVerification(frames, currentEmail, currentChallenge) {
    if (frames.length < 5) {
      setError("Not enough frames captured. Please try again.");
      setStep("email");
      return;
    }
    setStep("verifying");
    setError(null);
    try {
      const data = await apiFetch("/face/verify", {
        method: "POST",
        body: JSON.stringify({ email: currentEmail, frames, challenge_type: currentChallenge.type }),
      });
      login(data.user, data.token);
    } catch (e) {
      const msg = e?.response?.message || e?.response?.error || "Face not recognised or liveness check failed.";
      setError(msg);
      setStep("email");
      framesRef.current = [];
      setProgress(0);
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

  if (step === "email") {
    return (
      <>
        <button className="auth-back" onClick={onBack}>← Back to login</button>
        <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Enter your email, then follow the on-screen direction to verify your identity.
        </p>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <div style={{ background: "var(--paper-dark)", borderRadius: "8px", padding: "0.85rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.8 }}>
          <div style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem", fontSize: "0.84rem" }}>How it works:</div>
          <div>1️⃣ &nbsp;Enter your email and open the camera</div>
          <div>2️⃣ &nbsp;A 3-second countdown begins</div>
          <div>3️⃣ &nbsp;Follow the on-screen direction (e.g. turn left)</div>
          <div>4️⃣ &nbsp;Keep your face in the ring until the bar fills</div>
          <div>5️⃣ &nbsp;You're logged in ✅</div>
        </div>

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input" type="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus
          />
        </div>
        <button
          className="auth-submit" disabled={!email}
          onClick={() => {
            const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
            setChallenge(c);
            challengeRef.current = c;
            setError(null);
            setStep("challenge");
          }}
        >
          Continue to Camera
        </button>
      </>
    );
  }

  if (step === "verifying") {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔍</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>Verifying your identity…</div>
        <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>Running liveness check and face match</div>
      </div>
    );
  }

  const isCapturing = step === "capturing";

  return (
    <>
      <button className="auth-back" onClick={() => { stopCamera(); setStep("email"); setError(null); }}>
        ← Change email
      </button>

      {error && <div className="auth-alert auth-alert--error" style={{ marginBottom: "0.75rem" }}>{error}</div>}

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
          {isCapturing && poseMsg && (
            <div style={{ fontSize: "0.78rem", marginTop: "0.3rem", color: challengeDone ? "#16a34a" : "var(--accent)", fontWeight: 500 }}>
              {poseMsg}
            </div>
          )}
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
    </>
  );
}