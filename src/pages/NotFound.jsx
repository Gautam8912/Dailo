// 404 page — for any URL the router does not know.

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>🍽️</div>
        <h1>404 — Page not found</h1>
        <p className="sub">The page you are looking for is not on the menu.</p>
        <Link to="/" className="btn btn-primary btn-full" style={{ height: '48px' }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
