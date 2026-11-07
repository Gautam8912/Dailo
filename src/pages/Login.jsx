// User Login — checks email + password against localStorage.
//
// If the credentials belong to the admin, the user is sent to the Admin
// Dashboard instead of the shop. That single `if` is what keeps the two
// modules separate inside one website.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login, isLoggedIn, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // If already signed in, don't show the form again.
  if (isLoggedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Already signed in ✅</h1>
          <p className="sub">You are logged in to Food Express.</p>
          <Link to="/" className="btn btn-primary btn-full" style={{ height: '50px' }}>
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const result = login({ email, password });

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, 'error');
      return;
    }

    showToast(`Welcome back, ${result.session.name}! 👋`, 'success');

    // Admin → dashboard, customer → the page they came from (or home).
    const destination = result.isAdmin
      ? '/admin'
      : location.state?.from || '/';
    setTimeout(() => navigate(destination), 600);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome Back 👋</h1>
        <p className="sub">Sign in to continue ordering delicious food</p>

        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ height: '50px', marginTop: '8px' }}
          >
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'right', marginTop: '12px' }}>
          <Link
            to="/forgot-password"
            style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Forgot Password?
          </Link>
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>

        {/* Demo helper — must stay so a viva demo works on a fresh browser. */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            background: 'var(--light)',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: 'var(--gray)',
          }}
        >
          <b>Demo credentials:</b>
          <br />
          Customer: register a new account, or use the one you created.
          <br />
          Admin: <b>admin@foodexpress.com</b> / <b>admin123</b>
          <br />
          Or open the separate <Link to="/admin/login" style={{ color: 'var(--primary)' }}>Admin Login</Link>.
        </div>
      </div>
    </div>
  );
}
