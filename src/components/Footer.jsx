// Footer — copy of the original footer, links converted to <Link>.

import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div className="logo-icon">🍔</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
              Food <span style={{ color: 'var(--primary)' }}>Express</span>
            </span>
          </div>
          <p>
            Delicious food delivered fast. Your favorite meals from top restaurants,
            delivered in 30-45 minutes. Fresh, hot &amp; tasty!
          </p>
          <p style={{ marginTop: '12px' }}>
            📍 Markapur, Andhra Pradesh
            <br />
            📞 +91 98765 43210
            <br />
            ✉️ hello@foodexpress.com
          </p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <Link to="/">Home</Link>
          <br />
          <Link to="/#menuSection">Menu</Link>
          <br />
          <Link to="/cart">Cart</Link>
          <br />
          <Link to="/orders">My Orders</Link>
        </div>

        <div>
          <h4>Categories</h4>
          <Link to="/">Pizza 🍕</Link>
          <br />
          <Link to="/">Burger 🍔</Link>
          <br />
          <Link to="/">Biryani 🍚</Link>
          <br />
          <Link to="/">Desserts 🍰</Link>
        </div>

        <div>
          <h4>Support</h4>
          <Link to="/login">Login</Link>
          <br />
          <Link to="/register">Register</Link>
          <br />
          <Link to="/profile">My Profile</Link>
          <br />
          <Link to="/admin">Admin Panel</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Food Express. All rights reserved. Made with ❤️ for food lovers.</span>
        <span>React + Vite • demo data in localStorage</span>
      </div>
    </footer>
  );
}
