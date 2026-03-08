import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { useCart, useProfile } from "../hooks/useProfile";
import Navbar from "../components/nav/Navbar";

// ── Constants ──────────────────────────────────────────────────────────────
const CHALLENGES = [
  { type: "turn_left",  instruction: "Rotate your head", arrow: "↔️", hint: "Slowly rotate your head left or right" },
  { type: "turn_right", instruction: "Rotate your head", arrow: "↔️", hint: "Slowly rotate your head left or right" },
];
const CAPTURE_DURATION_MS = 5000;
const CAPTURE_INTERVAL_MS = 250;
const PAYMENT_METHODS = ["Credit Card", "Debit Card", "PayPal", "Cash on Delivery"];

// ── Step indicator ─────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ["Summary", "Verify", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0", marginBottom: "2.5rem" }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center" }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem"
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: i < current ? "var(--accent)" : i === current ? "var(--ink)" : "var(--border)",
              color: i <= current ? "white" : "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", fontWeight: 700,
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "0.72rem", color: i === current ? "var(--ink)" : "var(--muted)", fontWeight: i === current ? 600 : 400 }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ width: 80, height: 2, background: i < current ? "var(--accent)" : "var(--border)", margin: "0 0.5rem", marginBottom: "1.4rem", transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Order Summary Step ─────────────────────────────────────────────────────
function SummaryStep({ items, profile, paymentMethod, setPaymentMethod, shippingAddress, setShippingAddress, onProceed }) {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.book?.price || 0) * i.quantity, 0);
  const shipping = 5.00;
  const tax = subtotal * 0.06;
  const total = subtotal + shipping + tax;

  const savedAddress = profile?.profile?.address || null;
  const [addressMode, setAddressMode] = useState(savedAddress ? "saved" : "new");
  const [customAddress, setCustomAddress] = useState("");

  // Sync shippingAddress based on mode
  useEffect(() => {
    if (addressMode === "saved") {
      setShippingAddress(savedAddress || "");
    } else {
      setShippingAddress(customAddress);
    }
  }, [addressMode, customAddress, savedAddress]); // eslint-disable-line

  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, marginBottom: "1.25rem" }}>
        Order Summary
      </h2>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {items.map((item) => {
          const book = item.book || {};
          return (
            <div key={item.cart_id} style={{
              display: "grid", gridTemplateColumns: "48px 1fr auto",
              gap: "0.75rem", alignItems: "center",
              background: "var(--paper)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "0.75rem 1rem",
            }}>
              <div style={{ width: 48, height: 64, borderRadius: "4px", overflow: "hidden", background: "var(--paper-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: "var(--muted)" }}>
                {book.cover_image_url
                  ? <img src={book.cover_image_url} alt={book.book_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : book.book_name?.slice(0, 2)
                }
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.88rem" }}>{book.book_name}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{book.author?.name}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.2rem" }}>Qty: {item.quantity}</div>
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent)" }}>
                RM {(parseFloat(book.price || 0) * item.quantity).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shipping address */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--ink)" }}>
          Shipping Address
        </label>

        {/* Toggle — only shown if user has a saved address */}
        {savedAddress && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {[["saved", "📍 Saved Address"], ["new", "✏️ One-time Address"]].map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setAddressMode(mode)}
                style={{
                  flex: 1, padding: "0.5rem 0.75rem", borderRadius: "8px", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: "0.8rem", fontWeight: 500,
                  border: `1.5px solid ${addressMode === mode ? "var(--ink)" : "var(--border)"}`,
                  background: addressMode === mode ? "var(--ink)" : "var(--white)",
                  color: addressMode === mode ? "white" : "var(--muted)",
                  transition: "all 0.2s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {addressMode === "saved" && savedAddress ? (
          <div style={{
            padding: "0.65rem 0.9rem", border: "1.5px solid var(--border)", borderRadius: "8px",
            background: "var(--paper)", fontSize: "0.88rem", color: "var(--ink)", lineHeight: 1.5,
          }}>
            {savedAddress}
          </div>
        ) : (
          <textarea
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            rows={2}
            autoFocus={addressMode === "new"}
            placeholder="Enter your shipping address…"
            style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid var(--border)", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.88rem", resize: "vertical", background: "var(--white)", color: "var(--ink)", boxSizing: "border-box" }}
          />
        )}
      </div>

      {/* Payment method */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--ink)" }}>
          Payment Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1.5px solid var(--border)", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.88rem", background: "var(--white)", color: "var(--ink)", cursor: "pointer" }}
        >
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Pricing breakdown */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
        {[
          ["Subtotal", `RM ${subtotal.toFixed(2)}`],
          ["Shipping", `RM ${shipping.toFixed(2)}`],
          ["Tax (6%)", `RM ${tax.toFixed(2)}`],
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.87rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            <span>{label}</span><span>{val}</span>
          </div>
        ))}
        <div style={{ height: 1, background: "var(--border)", margin: "0.75rem 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
          <span>Total</span>
          <span style={{ color: "var(--accent)" }}>RM {total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!shippingAddress.trim()}
        style={{ width: "100%", padding: "0.85rem", background: "var(--ink)", color: "white", border: "none", borderRadius: "10px", fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, cursor: shippingAddress.trim() ? "pointer" : "not-allowed", opacity: shippingAddress.trim() ? 1 : 0.5 }}
      >
        Continue to Verification →
      </button>
    </div>
  );
}

// ── Auth Method Picker ─────────────────────────────────────────────────────
function AuthMethodStep({ hasFace, onChoose }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Verify Your Identity
      </h2>
      <p style={{ fontSize: "0.87rem", color: "var(--muted)", marginBottom: "1.75rem" }}>
        Confirm it's really you before placing the order.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button
          onClick={() => onChoose("password")}
          style={{
            display: "flex", alignItems: "center", gap: "1rem",
            padding: "1.1rem 1.25rem", border: "1.5px solid var(--border)",
            borderRadius: "10px", background: "var(--white)", cursor: "pointer",
            textAlign: "left", transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--ink)"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <span style={{ fontSize: "1.6rem" }}>🔑</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem" }}>Password</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>Confirm with your account password</div>
          </div>
        </button>

        <button
          onClick={() => hasFace ? onChoose("face") : null}
          disabled={!hasFace}
          style={{
            display: "flex", alignItems: "center", gap: "1rem",
            padding: "1.1rem 1.25rem", border: "1.5px solid var(--border)",
            borderRadius: "10px", background: hasFace ? "var(--white)" : "var(--paper)",
            cursor: hasFace ? "pointer" : "not-allowed", textAlign: "left",
            opacity: hasFace ? 1 : 0.55, transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => hasFace && (e.currentTarget.style.borderColor = "var(--ink)")}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <span style={{ fontSize: "1.6rem" }}>🫤</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem" }}>
              Face Recognition
              {!hasFace && <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 400, marginLeft: "0.5rem" }}>(not registered)</span>}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {hasFace ? "Confirm with face liveness detection" : "Register your face in Profile to use this"}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Password Verify Step ───────────────────────────────────────────────────
function PasswordVerifyStep({ paymentMethod, shippingAddress, notes, token, onSuccess, onBack }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function handleSubmit() {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/payment/verify-password", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password, payment_method: paymentMethod, shipping_address: shippingAddress, notes }),
      });
      onSuccess(data.data?.order);
    } catch (e) {
      setError(e?.response?.message || e?.response?.error || "Incorrect password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem", padding: 0 }}>
        ← Back
      </button>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Enter Password
      </h2>
      <p style={{ fontSize: "0.87rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        Confirm your identity to place the order.
      </p>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.65rem 0.9rem", fontSize: "0.83rem", color: "#c0392b", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <input
        type="password"
        placeholder="Your account password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        autoFocus
        style={{ width: "100%", padding: "0.7rem 0.9rem", border: "1.5px solid var(--border)", borderRadius: "8px", fontFamily: "var(--font-body)", fontSize: "0.92rem", marginBottom: "1.25rem", background: "var(--white)", color: "var(--ink)", boxSizing: "border-box" }}
      />

      <button
        onClick={handleSubmit}
        disabled={!password || loading}
        style={{ width: "100%", padding: "0.85rem", background: "var(--ink)", color: "white", border: "none", borderRadius: "10px", fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600, cursor: password && !loading ? "pointer" : "not-allowed", opacity: password && !loading ? 1 : 0.5 }}
      >
        {loading ? "Placing Order…" : "Confirm & Place Order"}
      </button>
    </div>
  );
}

// ── Face Verify Step ───────────────────────────────────────────────────────
function FaceVerifyStep({ paymentMethod, shippingAddress, notes, token, onSuccess, onBack }) {
  const [step, setStep]             = useState("challenge"); // challenge | verifying | error
  const [challenge, setChallenge]   = useState(null);
  const [countdown, setCountdown]   = useState(3);
  const [progress, setProgress]     = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);
  const [capturePhase, setCapturePhase]   = useState("move");
  const [poseMsg, setPoseMsg]       = useState("");
  const [camReady, setCamReady]     = useState(false);
  const [error, setError]           = useState(null);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const framesRef    = useRef([]);
  const timerRef     = useRef(null);
  const challengeRef = useRef(null);
  const capturingRef = useRef(false);

  useEffect(() => { challengeRef.current = challenge; }, [challenge]);

  // Pick challenge on mount
  useEffect(() => {
    const c = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    challengeRef.current = c;
    setChallenge(c);
  }, []);

  // Camera
  useEffect(() => {
    if (step !== "challenge") return;
    capturingRef.current = false;
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => setCamReady(true)).catch(() => {});
        }
      })
      .catch(() => setError("Could not access camera. Please allow camera permissions."));
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
    };
  }, [step]);

  // Countdown
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

  function captureFrame() {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
  }

  function startCapturing() {
    if (capturingRef.current) return;
    capturingRef.current = true;
    framesRef.current = [];
    setProgress(0);
    setCapturePhase("move");
    setChallengeDone(false);
    setPoseMsg("");

    const startTime = Date.now();
    const yawHistory = [];
    let lastPoseCheck = 0;

    timerRef.current = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min((elapsed / CAPTURE_DURATION_MS) * 100, 100));

      const frame = captureFrame();
      if (frame) framesRef.current.push(frame);

      // Real-time pose check every 400ms
      if (elapsed - lastPoseCheck > 400 && frame) {
        lastPoseCheck = elapsed;
        try {
          const res = await fetch("http://localhost:8000/api/face/check-pose", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ frame }),
          });
          const data = await res.json();
          const c = challengeRef.current;
          if (data.has_pose && (c?.type === "turn_left" || c?.type === "turn_right")) {
            yawHistory.push(data.yaw);
            if (yawHistory.length >= 3) {
              const sorted = [...yawHistory].sort((a, b) => a - b);
              const median = sorted[Math.floor(sorted.length / 2)];
              const deviation = Math.abs(data.yaw - median);
              const needed = 3;
              if (deviation >= needed) {
                setChallengeDone(true);
                setCapturePhase("hold");
                setPoseMsg(`✅ Head rotated ${deviation.toFixed(1)}° — hold still!`);
              } else {
                setPoseMsg(`Keep rotating… ${deviation.toFixed(1)}° / ${needed}°`);
              }
            }
          }
        } catch (_) {}
      }

      if (elapsed >= CAPTURE_DURATION_MS) {
        clearInterval(timerRef.current);
        capturingRef.current = false;
        submitFaceVerify(framesRef.current, challengeRef.current);
      }
    }, CAPTURE_INTERVAL_MS);
  }

  async function submitFaceVerify(frames, currentChallenge) {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (frames.length < 5) {
      setError("Not enough frames captured. Please try again.");
      return;
    }
    setStep("verifying");
    try {
      const data = await apiFetch("/payment/verify-face", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          frames,
          challenge_type: currentChallenge.type,
          payment_method: paymentMethod,
          shipping_address: shippingAddress,
          notes,
        }),
      });
      onSuccess(data.data?.order);
    } catch (e) {
      const msg = e?.response?.message || e?.response?.error || "Face verification failed. Please try again.";
      setError(msg);
      setStep("challenge");
      framesRef.current = [];
      setProgress(0);
    }
  }

  if (error && step !== "challenge") {
    return (
      <div>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#c0392b", marginBottom: "1.25rem" }}>{error}</div>
        <button onClick={() => { setError(null); setStep("challenge"); }} style={{ width: "100%", padding: "0.75rem", background: "var(--ink)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-body)" }}>Try Again</button>
      </div>
    );
  }

  const isCapturing = capturingRef.current || progress > 0;

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem", padding: 0 }}>
        ← Back
      </button>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Face Verification
      </h2>

      {step === "verifying" ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🔍</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>Verifying your identity…</div>
        </div>
      ) : (
        <>
          {/* Challenge banner */}
          {challenge && (
            <div style={{
              background: challengeDone ? "#f0fdf4" : "var(--paper)",
              border: `1.5px solid ${challengeDone ? "#86efac" : "var(--border)"}`,
              borderRadius: "10px", padding: "0.85rem 1.1rem", marginBottom: "1rem",
              textAlign: "center", transition: "all 0.3s",
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{challenge.arrow}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.95rem" }}>{challenge.instruction}</div>
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

          {/* Countdown overlay */}
          <div style={{ position: "relative" }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", borderRadius: "10px", aspectRatio: "4/3", objectFit: "cover", background: "#000", transform: "scaleX(-1)" }}
            />
            {countdown > 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", borderRadius: "10px" }}>
                <div style={{ fontSize: "5rem", fontFamily: "var(--font-display)", color: "white", fontWeight: 700 }}>{countdown}</div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {isCapturing && (
            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: "0.75rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: challengeDone ? "#16a34a" : "var(--accent)", borderRadius: 2, transition: "width 0.2s linear" }} />
            </div>
          )}

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.65rem 0.9rem", fontSize: "0.83rem", color: "#c0392b", marginTop: "0.75rem" }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Success Step ───────────────────────────────────────────────────────────
function SuccessStep({ order, pricing, onDone }) {
  const totalAmount = parseFloat(order?.total_amount || 0);
  // Derive breakdown: backend stores the full total, use pricing if available
  const subtotal  = pricing?.subtotal  ?? (totalAmount / 1.06 - 5).toFixed(2);
  const shippingF = pricing?.shipping  ?? "5.00";
  const taxF      = pricing?.tax       ?? ((totalAmount / 1.06 - 5) * 0.06).toFixed(2);

  return (
    <div style={{ textAlign: "center", padding: "1rem 0 2rem" }}>
      <div style={{ fontSize: "4rem", marginBottom: "1rem", animation: "pop 0.4s ease" }}>✅</div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>Order Placed!</h2>
      <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
        Your order has been confirmed and is being processed.
      </p>
      {order && (
        <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "1.75rem", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.87rem", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--muted)" }}>Order #</span>
            <span style={{ fontWeight: 600 }}>{order.order_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.87rem", marginBottom: "0.5rem" }}>
            <span style={{ color: "var(--muted)" }}>Payment</span>
            <span style={{ fontWeight: 600 }}>{order.payment_method}</span>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "0.6rem 0" }} />
          {[
            ["Subtotal",   `RM ${parseFloat(subtotal).toFixed(2)}`],
            ["Shipping",   `RM ${parseFloat(shippingF).toFixed(2)}`],
            ["Tax (6%)",   `RM ${parseFloat(taxF).toFixed(2)}`],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.83rem", color: "var(--muted)", marginBottom: "0.35rem" }}>
              <span>{label}</span><span>{val}</span>
            </div>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "0.6rem 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>
            <span>Total</span>
            <span style={{ color: "var(--accent)" }}>RM {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}
      <button
        onClick={onDone}
        style={{ padding: "0.8rem 2.5rem", background: "var(--ink)", color: "white", border: "none", borderRadius: "10px", fontFamily: "var(--font-display)", fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}
      >
        View My Orders
      </button>

      <style>{`@keyframes pop { 0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)} }`}</style>
    </div>
  );
}

// ── Main CheckoutPage ──────────────────────────────────────────────────────
export default function CheckoutPage({
  onNavigateHome, onNavigateToAuth, onNavigateToProfile,
  onNavigateToWishlist, onNavigateToOrders, onNavigateToCart,
  onNavigateToReviews, onNavigateToAdmin,
}) {
  const { token } = useAuth();
  const { items, loading: cartLoading } = useCart(token);
  const { profile } = useProfile(token);

  const [step, setStep]             = useState("summary");   // summary | auth | password | face | done
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [shippingAddress, setShippingAddress] = useState("");
  const [authMethod, setAuthMethod] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [completedPricing, setCompletedPricing] = useState(null);

  // Compute pricing from cart items
  const cartSubtotal = items.reduce((s, i) => s + parseFloat(i.book?.price || 0) * i.quantity, 0);
  const cartPricing = {
    subtotal: cartSubtotal.toFixed(2),
    shipping: "5.00",
    tax: (cartSubtotal * 0.06).toFixed(2),
  };

  const [hasFace, setHasFace] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch("/checkout/summary", { headers: { Authorization: `Bearer ${token}` } })
      .then((d) => setHasFace(d.data?.user?.has_face_registered ?? false))
      .catch(() => {});
  }, [token]);

  // Pre-fill payment method from profile
  useEffect(() => {
    const saved = profile?.profile?.payment_method;
    if (saved && PAYMENT_METHODS.includes(saved)) setPaymentMethod(saved);
  }, [profile]); // eslint-disable-line

  const stepIndex = { summary: 0, auth: 1, password: 1, face: 1, done: 2 }[step] ?? 0;

  function handleSuccess(order) {
    setCompletedOrder(order);
    setCompletedPricing(cartPricing);
    setStep("done");
  }

  return (
    <>
      <Navbar
        onLogoClick={onNavigateHome}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
        onNavigateToAdmin={onNavigateToAdmin}
        onNavigateHome={onNavigateHome}
        profileImage={profile?.profile?.profile_image_base64 || null}
      />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.75rem", textAlign: "center" }}>
          Checkout
        </h1>

        <Steps current={stepIndex} />

        {cartLoading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>Loading cart…</div>
        ) : items.length === 0 && step !== "done" ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
            <div style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--ink)" }}>Your cart is empty</div>
            <button onClick={onNavigateHome} style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: "var(--accent)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-body)" }}>
              Browse Books
            </button>
          </div>
        ) : (
          <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.75rem" }}>
            {step === "summary" && (
              <SummaryStep
                items={items}
                profile={profile}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                shippingAddress={shippingAddress}
                setShippingAddress={setShippingAddress}
                onProceed={() => setStep("auth")}
              />
            )}

            {step === "auth" && (
              <>
                <button onClick={() => setStep("summary")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.25rem", padding: 0 }}>
                  ← Back
                </button>
                <AuthMethodStep
                  hasFace={hasFace}
                  onChoose={(method) => { setAuthMethod(method); setStep(method); }}
                />
              </>
            )}

            {step === "password" && (
              <PasswordVerifyStep
                paymentMethod={paymentMethod}
                shippingAddress={shippingAddress}
                token={token}
                onSuccess={handleSuccess}
                onBack={() => setStep("auth")}
              />
            )}

            {step === "face" && (
              <FaceVerifyStep
                paymentMethod={paymentMethod}
                shippingAddress={shippingAddress}
                token={token}
                onSuccess={handleSuccess}
                onBack={() => setStep("auth")}
              />
            )}

            {step === "done" && (
              <SuccessStep order={completedOrder} pricing={completedPricing} onDone={onNavigateToOrders} />
            )}
          </div>
        )}
      </div>
    </>
  );
}