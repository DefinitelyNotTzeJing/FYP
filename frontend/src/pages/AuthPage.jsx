import { useState } from "react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";
import FaceLoginForm from "../components/auth/FaceLoginForm";
import "../styles/auth/AuthPage.css";

const QUOTES = [
  { text: "A reader lives a thousand lives before he dies.", cite: "— George R.R. Martin" },
  { text: "Not all those who wander are lost.", cite: "— J.R.R. Tolkien" },
  { text: "So many books, so little time.", cite: "— Frank Zappa" },
];

const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// view: "tabs" | "forgot" | "face" | "reset-success"
export default function AuthPage({ onNavigateHome }) {
  const [view, setView]   = useState("tabs");
  const [tab, setTab]     = useState("login"); // login | register

  return (
    <div className="auth-page">
      {/* Left decorative panel */}
      <div className="auth-page__panel">
        <div className="auth-page__panel-bg" />
        <div
          className="auth-page__panel-logo"
          onClick={onNavigateHome}
        >
          Folio<span>.</span>
        </div>
        <div className="auth-page__panel-quote">
          <blockquote>"{QUOTE.text}"</blockquote>
          <cite>{QUOTE.cite}</cite>
        </div>
      </div>

      {/* Right form area */}
      <div className="auth-page__form-area">
        <div className="auth-card">

          {/* ── Tabs: Login / Register ── */}
          {view === "tabs" && (
            <>
              <div className="auth-tabs">
                <button
                  className={`auth-tab${tab === "login" ? " auth-tab--active" : ""}`}
                  onClick={() => setTab("login")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab${tab === "register" ? " auth-tab--active" : ""}`}
                  onClick={() => setTab("register")}
                >
                  Create Account
                </button>
              </div>

              {tab === "login" ? (
                <>
                  <div className="auth-card__heading">Welcome back</div>
                  <div className="auth-card__sub">Sign in to your Folio account</div>
                  <LoginForm
                    onForgotPassword={() => setView("forgot")}
                    onFaceLogin={() => setView("face")}
                  />
                </>
              ) : (
                <>
                  <div className="auth-card__heading">Join Folio</div>
                  <div className="auth-card__sub">Create your account and start reading</div>
                  <RegisterForm />
                </>
              )}
            </>
          )}

          {/* ── Forgot Password ── */}
          {view === "forgot" && (
            <>
              <div className="auth-card__heading">Reset Password</div>
              <div className="auth-card__sub">We'll help you get back in</div>
              <ForgotPasswordForm
                onBack={() => setView("tabs")}
                onSuccess={() => setView("reset-success")}
              />
            </>
          )}

          {/* ── Face Login ── */}
          {view === "face" && (
            <>
              <div className="auth-card__heading">Face Sign In</div>
              <div className="auth-card__sub">Verify your identity with your camera</div>
              <FaceLoginForm onBack={() => setView("tabs")} />
            </>
          )}

          {/* ── Reset Success ── */}
          {view === "reset-success" && (
            <>
              <div className="auth-card__heading">Password Reset!</div>
              <div className="auth-card__sub">Your password has been updated successfully.</div>
              <div
                className="auth-alert auth-alert--success"
                style={{ marginTop: "1rem" }}
              >
                ✓ You can now sign in with your new password.
              </div>
              <button
                className="auth-submit"
                style={{ marginTop: "1rem" }}
                onClick={() => { setView("tabs"); setTab("login"); }}
              >
                Back to Sign In
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}