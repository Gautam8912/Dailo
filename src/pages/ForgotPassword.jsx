// Forgot Password — two steps in one page, exactly like the original:
//   1. verify the email exists in localStorage
//   2. then show the "set a new password" form

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { findUserByEmail, resetPassword } from '../services/authService';

export default function ForgotPassword() {
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  function handleVerify(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const result = findUserByEmail(email);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setVerifiedEmail(result.email);
    setSuccess(`Email verified! Set new password for ${result.email}`);
    showToast('Email verified. Set new password.', 'success');
  }

  function handleReset(event) {
    event.preventDefault();
    setResetError('');
    setResetSuccess('');

    const result = resetPassword(verifiedEmail, newPassword, confirmPassword);
    if (!result.ok) {
      setResetError(result.message);
      return;
    }
    setResetSuccess(result.message);
    showToast('Password updated successfully!', 'success');
    setTimeout(() => navigate('/login'), 1200);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Forgot Password? 🔑</h1>
        <p className="sub">Enter your registered email to reset password</p>

        {error && <div className="error-msg" style={{ display: 'block' }}>{error}</div>}
        {success && <div className="success-msg" style={{ display: 'block' }}>{success}</div>}

        <form onSubmit={handleVerify}>
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
          <button type="submit" className="btn btn-primary btn-full" style={{ height: '50px' }}>
            Verify Email
          </button>
        </form>

        {verifiedEmail && (
          <div
            style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <h3 style={{ marginBottom: '12px' }}>Reset Your Password</h3>
            {resetError && <div className="error-msg" style={{ display: 'block' }}>{resetError}</div>}
            {resetSuccess && <div className="success-msg" style={{ display: 'block' }}>{resetSuccess}</div>}

            <form onSubmit={handleReset}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" style={{ height: '50px' }}>
                Update Password
              </button>
            </form>
          </div>
        )}

        <div className="auth-footer" style={{ marginTop: '20px' }}>
          Remember password? <Link to="/login">Sign In</Link> •{' '}
          <Link to="/register">Create Account</Link>
        </div>

        <div
          style={{
            marginTop: '16px',
            padding: '10px',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: '10px',
            fontSize: '0.82rem',
            color: '#9a3412',
          }}
        >
          ⚠️ This is a frontend demo only. No real email is sent. Password is updated
          directly in localStorage.
        </div>
      </div>
    </div>
  );
}
