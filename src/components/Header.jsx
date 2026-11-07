// Header — same markup/classes as the old header, now written in JSX.
// Links use <Link> so the page never reloads (that is the point of a SPA).

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Header({ activePage = '' }) {
  const { session, isLoggedIn, isAdmin, cartCount, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    setTimeout(() => navigate('/'), 600);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="header">
      <Link
        to={isAdmin ? '/admin' : '/'}
        className="logo"
        onClick={closeMenu}
      >
        <div className="logo-icon">🍔</div>
        Food <span>Express</span>
        {isAdmin && (
          <span
            style={{
              background: 'var(--dark)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              marginLeft: '8px',
            }}
          >
            ADMIN
          </span>
        )}
      </Link>

      <nav className={`nav ${menuOpen ? 'open' : ''}`} id="mainNav">
        {isAdmin ? (
          <>
            <NavLink to="/admin" onClick={closeMenu} end>
              Dashboard
            </NavLink>
            <NavLink to="/" onClick={closeMenu} end>
              View Site
            </NavLink>
          </>
        ) : (
          <>
            <Link
              to="/"
              onClick={closeMenu}
              className={activePage === 'home' ? 'active' : ''}
            >
              Home
            </Link>
            <Link to="/#menuSection" onClick={closeMenu}>
              Menu
            </Link>
            {isLoggedIn && (
              <Link
                to="/orders"
                onClick={closeMenu}
                className={activePage === 'orders' ? 'active' : ''}
              >
                Orders
              </Link>
            )}
            {isLoggedIn && (
              <Link
                to="/profile"
                onClick={closeMenu}
                className={activePage === 'profile' ? 'active' : ''}
              >
                Profile
              </Link>
            )}
          </>
        )}
      </nav>

      <div className="header-actions">
        {!isAdmin && (
          <Link to="/cart" className="cart-btn" title="Cart" onClick={closeMenu}>
            🛒
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </Link>
        )}

        {!isLoggedIn && (
          <>
            <Link to="/login" className="btn btn-outline btn-small">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary btn-small">
              Sign Up
            </Link>
          </>
        )}

        {isLoggedIn && (
          <button className="btn btn-outline btn-small" onClick={handleLogout}>
            Logout
          </button>
        )}

        <button
          className="hamburger"
          aria-label="Menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Small helper line so a visitor always knows which module they are in. */}
      {session && (
        <span className="sr-only">
          Signed in as {session.name} ({session.role})
        </span>
      )}
    </header>
  );
}
