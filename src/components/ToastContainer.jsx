// ToastContainer — the floating success / error popups.
// React renders the list; AppContext adds and removes the items.

import { useApp } from '../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useApp();

  return (
    <div className="toast-container" id="toastContainer">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ️';
        return (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span>{icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
