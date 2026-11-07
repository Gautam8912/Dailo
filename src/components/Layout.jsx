// Layout — header + page + footer. Every "normal" page is rendered in the
// <Outlet /> in the middle, so the header/footer are written only once.

import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ToastContainer from './ToastContainer';

const PAGE_NAMES = {
  '/': 'home',
  '/cart': 'cart',
  '/orders': 'orders',
  '/profile': 'profile',
};

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <ToastContainer />
      <Header activePage={PAGE_NAMES[pathname] || ''} />
      <Outlet />
      <Footer />
    </>
  );
}
