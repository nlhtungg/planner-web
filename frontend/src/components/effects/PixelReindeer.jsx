import React from 'react';

export default function PixelReindeer({ className, title = 'Pixel reindeer' }) {
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
        16x16 pixel reindeer silhouette.
        Uses currentColor only (no new hard-coded theme colors).
      */}

      {/* Antlers */}
      <rect x="2" y="1" width="1" height="3" fill="currentColor" opacity="0.95" />
      <rect x="1" y="2" width="2" height="1" fill="currentColor" opacity="0.95" />
      <rect x="13" y="1" width="1" height="3" fill="currentColor" opacity="0.95" />
      <rect x="13" y="2" width="2" height="1" fill="currentColor" opacity="0.95" />

      {/* Head */}
      <rect x="4" y="3" width="8" height="6" fill="currentColor" opacity="0.9" />

      {/* Snout */}
      <rect x="10" y="6" width="3" height="3" fill="currentColor" opacity="0.9" />

      {/* Nose */}
      <rect x="12" y="7" width="1" height="1" fill="currentColor" opacity="0.35" />

      {/* Eye */}
      <rect x="6" y="5" width="1" height="1" fill="currentColor" opacity="0.25" />

      {/* Body (sitting) */}
      <rect x="3" y="9" width="9" height="5" fill="currentColor" opacity="0.85" />

      {/* Front leg */}
      <rect x="9" y="12" width="2" height="2" fill="currentColor" opacity="0.9" />

      {/* Back leg */}
      <rect x="4" y="12" width="2" height="2" fill="currentColor" opacity="0.9" />

      {/* Tail */}
      <rect x="2" y="10" width="1" height="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
