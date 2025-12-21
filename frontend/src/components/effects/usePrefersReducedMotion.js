import { useEffect, useState } from 'react';

export default function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(Boolean(mediaQueryList.matches));

    update();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', update);
      return () => mediaQueryList.removeEventListener('change', update);
    }

    mediaQueryList.addListener(update);
    return () => mediaQueryList.removeListener(update);
  }, []);

  return prefersReducedMotion;
}
