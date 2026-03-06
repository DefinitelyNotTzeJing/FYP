import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

export default function Navbar({ searchInput, onSearchChange, onLogoClick, onNavigateToAuth }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__logo" onClick={onLogoClick}>
          Folio<span>.</span>
        </div>

        <div className="navbar__search">
          <span className="navbar__search-icon">⌕</span>
          <input
            className="navbar__search-input"
            placeholder="Search books, authors…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="navbar__actions">
          <button className="navbar__action-btn">♡ <span>Wishlist</span></button>
          <button className="navbar__action-btn">🛒 <span>Cart</span></button>
          {user ? (
            <>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Hi, {user.username}
              </span>
              <button className="navbar__action-btn" onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <button className="navbar__action-btn" onClick={onNavigateToAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}