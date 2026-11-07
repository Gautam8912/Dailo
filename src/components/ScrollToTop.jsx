// ScrollToTop — a tiny helper so a new page opens at the top.
// If the URL has a #hash (e.g. "/#menuSection") we scroll to that element instead.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait one frame so the target section is already rendered.
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
