// Admin Login — a separate entry point from the normal user login.
//
// It reuses the same login() from localStorage, but afterwards checks the role.
// A normal customer who tries this page is rejected (they must use /login).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ToastContainer from '../../components/ToastContainer';

export default function AdminLogin() {
  const { login, isAdmin, showToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const result = login({ email, password });

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, 'error');
      return;
    }
    if (!result.isAdmin) {
      setError('This account is a customer account. Please use the normal login page.');
      showToast('Access denied. Admin only.', 'error');
      return;
    }

    showToast('Welcome, Admin! 👑', 'success');
    setTimeout(() => navigate('/admin'), 500);
  }

  return (
    <>
      <ToastContainer />
      <div className="auth-page">
        <div className="auth-card">
          <div
            style={{
              display: 'inline-block',
              background: 'var(--dark)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '100px',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              marginBottom: '14px',
            }}
          >
            ADMIN ACCESS
          </div>

          <h1>Admin Login 👑</h1>
          <p className="sub">Sign in to manage products, orders and users</p>

          {isAdmin && (
            <div className="success-msg" style={{ display: 'block' }}>
              You are already logged in as admin.{' '}
              <Link to="/admin" style={{ fontWeight: 700 }}>
                Open dashboard →
              </Link>
            </div>
          )}

          {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Admin Email</label>
              <input
                type="email"
                placeholder="admin@foodexpress.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter admin password"
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
              Sign In as Admin
            </button>
          </form>

          <div className="auth-footer">
            Not an admin? <Link to="/login">Go to customer login</Link>
          </div>

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
            <b>Demo admin credentials:</b>
            <br />
            admin@foodexpress.com / admin123
          </div>
        </div>
      </div>
    </>
  );
}
