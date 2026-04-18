import { useState, useEffect } from "react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import ForgotPasswordForm from "../components/auth/ForgotPasswordForm";
import FaceLoginForm from "../components/auth/FaceLoginForm";
import { apiFetch } from "../utils/api";
import { useTheme } from "../hooks/useTheme";
import "../styles/auth/AuthPage.css";

const QUOTES = [
  { text: "A reader lives a thousand lives before he dies.", cite: "— George R.R. Martin" },
  { text: "Not all those who wander are lost.", cite: "— J.R.R. Tolkien" },
  { text: "So many books, so little time.", cite: "— Frank Zappa" },
  { text: "There is no friend as loyal as a book.", cite: "— Ernest Hemingway" },
  { text: "One must always be careful of books.", cite: "— Cassandra Clare" },
];

const QUOTE = QUOTES[Math.floor(Math.random() * QUOTES.length)];

// Absolute positions for up to 8 book slots across the panel
const SLOTS = [
  { top: "5%",  left: "6%",  w: 108, rot: -3,    dur: 5.6, delay: 0.0 },
  { top: "3%",  left: "42%", w: 86,  rot:  2.5,  dur: 6.8, delay: 0.9 },
  { top: "7%",  left: "66%", w: 98,  rot: -1.5,  dur: 5.1, delay: 1.6 },
  { top: "37%", left: "3%",  w: 80,  rot:  3.0,  dur: 7.1, delay: 0.5 },
  { top: "34%", left: "40%", w: 114, rot: -2.0,  dur: 5.9, delay: 1.3 },
  { top: "39%", left: "68%", w: 84,  rot:  2.0,  dur: 6.3, delay: 0.2 },
  { top: "63%", left: "10%", w: 94,  rot: -1.5,  dur: 5.4, delay: 1.1 },
  { top: "61%", left: "54%", w: 104, rot:  1.5,  dur: 6.6, delay: 0.7 },
];

// view: "tabs" | "forgot" | "face" | "reset-success"
export default function AuthPage({ onNavigateHome }) {
  const { dark, toggle: toggleTheme } = useTheme();
  const [view, setView]       = useState("tabs");
  const [tab, setTab]         = useState("login");
  const [panelBooks, setPanelBooks] = useState([]);

  useEffect(() => {
    apiFetch("/books?per_page=20&sort_by=created_at&sort_order=desc")
      .then((d) => {
        const all = (d.data || []).filter((b) => b.cover_image_url);
        // shuffle and take up to 8
        const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 8);
        setPanelBooks(shuffled);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="auth-page">
      {/* Left decorative panel */}
      <div className="auth-page__panel">
        {/* Accent glow */}
        <div className="auth-page__panel-bg" />

        {/* Floating book covers */}
        <div className="auth-page__books" aria-hidden="true">
          {panelBooks.map((book, i) => {
            const slot = SLOTS[i] ?? SLOTS[i % SLOTS.length];
            return (
              <div
                key={book.book_id}
                className="auth-page__book-drift"
                style={{
                  top: slot.top,
                  left: slot.left,
                  "--enter-delay": `${slot.delay}s`,
                  "--drift-dur": `${slot.dur}s`,
                }}
              >
                <div
                  className="auth-page__book-cover"
                  style={{
                    width: slot.w,
                    transform: `rotate(${slot.rot}deg)`,
                  }}
                >
                  <img src={book.cover_image_url} alt="" draggable="false" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Gradient overlay — keeps quote + logo readable */}
        <div className="auth-page__panel-overlay" />

        {/* Logo */}
        <div className="auth-page__panel-logo" onClick={onNavigateHome}>
          Folio<span>.</span>
        </div>

        {/* Quote */}
        <div className="auth-page__panel-quote">
          <blockquote>"{QUOTE.text}"</blockquote>
          <cite>{QUOTE.cite}</cite>
        </div>
      </div>

      {/* Right form area */}
      <div className="auth-page__form-area">
        {/* Theme toggle — top-right corner */}
        <button className="auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

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