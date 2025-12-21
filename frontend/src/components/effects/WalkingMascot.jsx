import React from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import PixelAnimal from './PixelAnimal';

export default function WalkingMascot({ enabled = true, darkMode = false }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!enabled || prefersReducedMotion) {
    return null;
  }

  const colorClass = darkMode ? 'text-white/70' : 'text-slate-700/35';

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none">
      <div className="mascot-walk-path absolute top-0 left-0">
        <div className="mascot-bob">
          <PixelAnimal className={`${colorClass} w-10 h-10 drop-shadow`} title="Walking critter" />
        </div>
      </div>
    </div>
  );
}
