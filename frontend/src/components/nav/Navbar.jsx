import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Navbar.css";

export default function Navbar({
  searchInput, onSearchChange, onLogoClick,
  onNavigateToAuth, onNavigateToProfile,
  onNavigateToWishlist, onNavigateToOrders,
  onNavigateToCart, onNavigateToReviews,
  cartCount = 0, wishlistCount = 0,
}) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function go(fn) {
    setDropdownOpen(false);
    fn?.();
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__logo" onClick={onLogoClick}>
          Folio<span>.</span>
        </div>

        {onSearchChange && (
          <div className="navbar__search">
            <span className="navbar__search-icon">⌕</span>
            <input
              className="navbar__search-input"
              placeholder="Search books, authors…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        <div className="navbar__actions">
          {/* User dropdown / Sign in */}
          {user ? (
            <div className="navbar__user-menu" ref={dropdownRef}>
              <button
                className="navbar__user-btn"
                onClick={() => setDropdownOpen((v) => !v)}
              >
                <span className="navbar__avatar">
                  {user.username?.slice(0, 2).toUpperCase()}
                </span>
                <span className="navbar__username">{user.username}</span>
                <span className="navbar__chevron">{dropdownOpen ? "▲" : "▼"}</span>
              </button>

              {dropdownOpen && (
                <div className="navbar__dropdown">
                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToProfile)}>
                    👤 Profile
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToWishlist)}>
                    <span className="navbar__dropdown-icon-wrap">
                      ♡ Wishlist
                      {wishlistCount > 0 && (
                        <span className="navbar__dropdown-badge">{wishlistCount}</span>
                      )}
                    </span>
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToOrders)}>
                    📦 Orders
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToCart)}>
                    <span className="navbar__dropdown-icon-wrap">
                      🛒 Cart
                      {cartCount > 0 && (
                        <span className="navbar__dropdown-badge">{cartCount}</span>
                      )}
                    </span>
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToReviews)}>
                    ⭐ My Reviews
                  </button>

                  <div className="navbar__dropdown-divider" />

                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={() => go(logout)}>
                    ↩ Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="navbar__signin-btn" onClick={onNavigateToAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}