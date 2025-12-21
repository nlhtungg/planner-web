import React, { useEffect, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import PixelReindeer from './PixelReindeer';

export default function PixelAnimalPopup({ enabled = true, darkMode = false }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const showTimer = window.setTimeout(() => setVisible(true), 650);
    const hideTimer = window.setTimeout(() => setVisible(false), 12000);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [enabled]);

  if (!enabled || !visible) {
    return null;
  }

  const containerClass = darkMode
    ? 'bg-slate-900/35 border-white/10 text-white'
    : 'bg-white/60 border-white/40 text-slate-800';

  const secondaryTextClass = darkMode ? 'text-white/80' : 'text-slate-500';

  const animalColorClass = darkMode ? 'text-white/90' : 'text-slate-800/70';

  return (
    <div className="fixed right-5 bottom-5 z-30 pointer-events-none">
      <div
        className={`${containerClass} backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-lg animate-slide-in`}
      >
        <div className="flex items-center gap-3">
          <div className="mascot-bob">
            <PixelReindeer className={`w-8 h-8 ${animalColorClass}`} title="Hello" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">
              {prefersReducedMotion ? 'Welcome' : 'Happy holidays'}
            </div>
            <div className={`text-xs ${secondaryTextClass}`}>
              {prefersReducedMotion ? 'Enjoy your dashboard.' : 'Snow mode: on.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
