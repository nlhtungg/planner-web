import React from 'react';

export default function SantaLoader({ message = 'Loading…' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />

      <div className="relative mx-4 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 px-8 py-7 shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
        <div className="flex flex-col items-center">
          <div className="text-3xl leading-none">🎅</div>

          <div className="mt-4 relative h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-red-500/40 border-t-white border-r-white" />
            <div className="absolute inset-[7px] rounded-full border border-white/10 bg-slate-950/40" />
          </div>

          <p className="mt-4 text-center text-sm font-medium text-white">
            {message}
          </p>
          <p className="mt-1 text-center text-xs text-slate-300/70">
            Making things merry…
          </p>
        </div>
      </div>
    </div>
  );
}
