import React, { useEffect, useMemo, useRef } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function SnowOverlay({ enabled = true, intensity = 1, darkMode = false }) {
  const canvasRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const config = useMemo(() => {
    const clampedIntensity = Math.max(0.2, Math.min(2, Number(intensity) || 1));
    return {
      intensity: clampedIntensity,
    };
  }, [intensity]);

  useEffect(() => {
    if (!enabled || prefersReducedMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let snowColor = 'rgba(255,255,255,0.9)';
    try {
      const computed = window.getComputedStyle(canvas);
      if (computed?.color) {
        snowColor = computed.color;
      }
    } catch {
      // ignore
    }

    let animationFrameId = 0;

    const state = {
      width: 0,
      height: 0,
      dpr: 1,
      flakes: [],
    };

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      state.dpr = dpr;
      state.width = Math.max(1, Math.floor(rect.width));
      state.height = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(state.width * dpr);
      canvas.height = Math.floor(state.height * dpr);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.floor((state.width * state.height) / 18000 * (60 * config.intensity));
      const count = Math.max(30, Math.min(220, targetCount));

      if (state.flakes.length > count) {
        state.flakes = state.flakes.slice(0, count);
      }

      while (state.flakes.length < count) {
        state.flakes.push({
          x: randomBetween(0, state.width),
          y: randomBetween(0, state.height),
          r: randomBetween(0.8, 2.2),
          vx: randomBetween(-0.15, 0.15),
          vy: randomBetween(0.35, 1.1),
          alpha: randomBetween(0.25, 0.85),
        });
      }
    };

    resize();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const step = () => {
      ctx.clearRect(0, 0, state.width, state.height);

      // soft, subtle snow
      for (const flake of state.flakes) {
        flake.x += flake.vx;
        flake.y += flake.vy;

        if (flake.y > state.height + 10) {
          flake.y = -10;
          flake.x = randomBetween(0, state.width);
        }

        if (flake.x < -10) flake.x = state.width + 10;
        if (flake.x > state.width + 10) flake.x = -10;

        ctx.globalAlpha = flake.alpha;
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        ctx.fillStyle = snowColor;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animationFrameId = window.requestAnimationFrame(step);
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', onResize);
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled, prefersReducedMotion, config.intensity]);

  if (!enabled) {
    return null;
  }

  const canvasColorClass = darkMode ? 'text-white/90' : 'text-slate-400/35';

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${canvasColorClass}`}
        aria-hidden="true"
      />
    </div>
  );
}
