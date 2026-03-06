import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

export default function FaceLoginForm({ onBack }) {
  const { login }             = useAuth();
  const [email, setEmail]     = useState("");
  const [step, setStep]       = useState("email"); // email | camera
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [camReady, setCamReady] = useState(false);

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  // Start webcam when step === camera
  useEffect(() => {
    if (step !== "camera") return;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCamReady(true);
        }
      })
      .catch(() => setError("Could not access camera. Please allow camera permissions."));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCamReady(false);
    };
  }, [step]);

  function captureAndVerify() {
    if (!videoRef.current || !camReady) return;
    setLoading(true);
    setError(null);

    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const image = canvas.toDataURL("image/jpeg").split(",")[1];

    apiFetch("/face/verify", {
      method: "POST",
      body: JSON.stringify({ email, image }),
    })
      .then((data) => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        login(data.user, data.token);
      })
      .catch(() => {
        setError("Face not recognised. Please try again or use password.");
        setLoading(false);
      });
  }

  if (step === "email") {
    return (
      <>
        <button className="auth-back" onClick={onBack}>← Back to login</button>
        <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Enter your email, then we'll verify your identity using your camera.
        </p>
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <button
          className="auth-submit"
          disabled={!email}
          onClick={() => { setError(null); setStep("camera"); }}
        >
          Continue to Camera
        </button>
      </>
    );
  }

  return (
    <>
      <button className="auth-back" onClick={() => { setStep("email"); setError(null); }}>
        ← Change email
      </button>
      <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1rem" }}>
        Signing in as <strong>{email}</strong>
      </p>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}

      <div className="camera-wrap">
        <video ref={videoRef} muted playsInline />
        <div className="camera-overlay">
          <div className="camera-ring" />
        </div>
      </div>

      <p className="camera-hint">
        Position your face within the circle and click Verify
      </p>

      <button
        className="auth-submit"
        onClick={captureAndVerify}
        disabled={loading || !camReady}
      >
        {loading ? "Verifying…" : camReady ? "Verify My Face" : "Starting camera…"}
      </button>
    </>
  );
}