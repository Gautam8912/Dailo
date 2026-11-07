// Route guards — separate access for the User module and the Admin module.
//
// User pages need a logged-in user; admin pages need a logged-in ADMIN.
// Without the right role the visitor is sent to the matching login page.

import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/** Wraps a customer-only page (Orders, Profile). */
export function ProtectedRoute({ children }) {
  const { isLoggedIn } = useApp();
  const location = useLocation();

  if (!isLoggedIn) {
    // Remember where the user wanted to go, so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Wraps the admin dashboard. */
export function AdminRoute({ children }) {
  const { isAdmin } = useApp();

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
