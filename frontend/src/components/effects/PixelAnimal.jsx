import React from 'react';

export default function PixelAnimal({ className, title = 'Pixel critter' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="48"
      height="48"
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      {/*
        A tiny 16x16 pixel-style cat/fox hybrid.
        Uses currentColor only to avoid introducing new hard-coded colors.
      */}
      {/* Ears */}
      <rect x="2" y="2" width="3" height="3" fill="currentColor" />
      <rect x="11" y="2" width="3" height="3" fill="currentColor" />

      {/* Head */}
      <rect x="3" y="4" width="10" height="8" fill="currentColor" />

      {/* Eyes (same color, lower opacity) */}
      <rect x="5" y="7" width="2" height="2" fill="currentColor" opacity="0.22" />
      <rect x="9" y="7" width="2" height="2" fill="currentColor" opacity="0.22" />

      {/* Nose */}
      <rect x="7" y="9" width="2" height="1" fill="currentColor" opacity="0.3" />

      {/* Feet */}
      <rect x="4" y="12" width="3" height="2" fill="currentColor" />
      <rect x="9" y="12" width="3" height="2" fill="currentColor" />

      {/* Outline-ish corners */}
      <rect x="3" y="3" width="1" height="1" fill="currentColor" />
      <rect x="12" y="3" width="1" height="1" fill="currentColor" />
    </svg>
  );
}
