import { useState, useRef, useEffect } from "react";
import { Search, User, Heart, Package, ShoppingCart, Star, LogOut, ChevronUp, ChevronDown, Clock, Settings, Sun, Moon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../hooks/useTheme";
import "../../styles/Navbar.css";

export default function Navbar({
  searchInput, onSearchChange, onLogoClick,
  onNavigateToAuth, onNavigateToProfile,
  onNavigateToWishlist, onNavigateToOrders,
  onNavigateToCart, onNavigateToReviews,
  onNavigateToPreorders,
  onNavigateHome,
  onNavigateToAdmin,
  cartCount = 0, wishlistCount = 0,
  profileImage = null,
}) {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
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
        <button className="navbar__logo" onClick={onLogoClick} aria-label="Go to homepage">
          Folio<span>.</span>
        </button>

        {onSearchChange && (
          <div className="navbar__search">
            <span className="navbar__search-icon"><Search size={14} /></span>
            <input
              className="navbar__search-input"
              placeholder="Search books, authors…"
              aria-label="Search books and authors"
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
                <span className="navbar__avatar" style={{ overflow: "hidden", padding: 0 }}>
                  {profileImage
                    ? <img src={profileImage} alt={user.username} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : user.username?.slice(0, 2).toUpperCase()
                  }
                </span>
                <span className="navbar__username">{user.username}</span>
                <span className="navbar__chevron">{dropdownOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
              </button>

              {dropdownOpen && (
                <div className="navbar__dropdown">
                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToProfile)}>
                    <User size={14} /> Profile
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToWishlist)}>
                    <span className="navbar__dropdown-icon-wrap">
                      <Heart size={14} /> Wishlist
                      {wishlistCount > 0 && (
                        <span className="navbar__dropdown-badge">{wishlistCount}</span>
                      )}
                    </span>
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToOrders)}>
                    <Package size={14} /> Orders
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToCart)}>
                    <span className="navbar__dropdown-icon-wrap">
                      <ShoppingCart size={14} /> Cart
                      {cartCount > 0 && (
                        <span className="navbar__dropdown-badge">{cartCount}</span>
                      )}
                    </span>
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToReviews)}>
                    <Star size={14} /> My Reviews
                  </button>

                  <button className="navbar__dropdown-item" onClick={() => go(onNavigateToPreorders)}>
                    <Clock size={14} /> Pre-orders
                  </button>

                  {user?.is_admin && (
                    <>
                      <div className="navbar__dropdown-divider" />
                      <button className="navbar__dropdown-item navbar__dropdown-item--admin" onClick={() => go(onNavigateToAdmin)}>
                        <Settings size={14} /> Admin Panel
                      </button>
                    </>
                  )}

                  <div className="navbar__dropdown-divider" />

                  <button className="navbar__dropdown-item navbar__dropdown-item--theme" onClick={toggleTheme}>
                    {dark ? <Sun size={14} /> : <Moon size={14} />}
                    {dark ? "Light Mode" : "Dark Mode"}
                    <span className="navbar__theme-switch" aria-hidden="true">
                      <span className={`navbar__theme-knob${dark ? " navbar__theme-knob--on" : ""}`} />
                    </span>
                  </button>

                  <div className="navbar__dropdown-divider" />

                  <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={() => { go(logout); onNavigateHome?.(); }}>
                    <LogOut size={14} /> Sign Out
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