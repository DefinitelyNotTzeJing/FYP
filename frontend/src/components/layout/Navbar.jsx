import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { getCartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">BookHaven</span>
        </Link>

        <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Home
          </Link>
          <Link to="/books" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Books
          </Link>
          
          {isAdmin && (
            <Link to="/admin" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Admin
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          <Link to="/cart" className="nav-icon cart-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 2L7.17 4H4a2 2 0 00-2 2v13a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-3.17L15 2H9z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            {getCartCount() > 0 && (
              <span className="cart-badge">{getCartCount()}</span>
            )}
          </Link>

          {user ? (
            <div className="user-menu">
              <button className="user-button">
                <span className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{user.name}</span>
              </button>
              <div className="dropdown-menu">
                <Link to="/profile" className="dropdown-item">
                  Profile
                </Link>
                <Link to="/orders" className="dropdown-item">
                  Orders
                </Link>
                <button onClick={logout} className="dropdown-item">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}

          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;