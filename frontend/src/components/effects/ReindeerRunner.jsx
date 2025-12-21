import React, { useEffect, useMemo, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import PixelReindeer from './PixelReindeer';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function ReindeerRunner({
  enabled = true,
  darkMode = false,
  containerRef,
  avoidRef,
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const runnerRef = useRef(null);
  const [phase, setPhase] = useState('run');

  const colorClass = useMemo(() => {
    return darkMode ? 'text-white/75' : 'text-slate-700/50';
  }, [darkMode]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (prefersReducedMotion) {
      setPhase('idle');
      return;
    }

    const containerEl = containerRef?.current;
    const avoidEl = avoidRef?.current;
    const runnerEl = runnerRef.current;

    if (!containerEl || !runnerEl) {
      return;
    }

    let animation;
    let raf1 = 0;

    const start = () => {
      const containerRect = containerEl.getBoundingClientRect();
      const runnerRect = runnerEl.getBoundingClientRect();

      const padding = 10;
      const startX = -runnerRect.width - padding;

      let endX = containerRect.width - runnerRect.width - padding;

      if (avoidEl) {
        const avoidRect = avoidEl.getBoundingClientRect();
        const avoidLeftInContainer = avoidRect.left - containerRect.left;
        endX = avoidLeftInContainer - runnerRect.width - 12;
      }

      endX = clamp(endX, 24, containerRect.width - runnerRect.width - padding);

      // run once (and stay at the end position)
      setPhase('run');

      animation = runnerEl.animate(
        [
          { transform: `translateX(${startX}px) translateY(-50%)` },
          { transform: `translateX(${endX}px) translateY(-50%)` },
        ],
        {
          duration: 3200,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      animation.finished
        .then(() => setPhase('idle'))
        .catch(() => {
          // ignore cancellation
        });
    };

    // Wait one frame for layout so widths are correct.
    raf1 = window.requestAnimationFrame(start);

    return () => {
      if (raf1) {
        window.cancelAnimationFrame(raf1);
      }
      if (animation) {
        animation.cancel();
      }
    };
  }, [enabled, prefersReducedMotion, containerRef, avoidRef]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[6] pointer-events-none" aria-hidden="true">
      <div
        ref={runnerRef}
        className={`absolute left-0 top-1/2 ${phase === 'idle' ? 'reindeer-idle' : 'reindeer-run'}`}
        style={{ transform: 'translateX(-80px) translateY(-50%)' }}
      >
        <PixelReindeer className={`${colorClass} w-10 h-10 drop-shadow`} title="Reindeer" />
      </div>
    </div>
  );
}
