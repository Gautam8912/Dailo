// AuthLayout — the login / signup / forgot-password pages keep the full-height
// gradient background but (like the original) show no footer.

import { Outlet } from 'react-router-dom';
import Header from './Header';
import ToastContainer from './ToastContainer';

export default function AuthLayout() {
  return (
    <>
      <ToastContainer />
      <Header />
      <Outlet />
    </>
  );
}
