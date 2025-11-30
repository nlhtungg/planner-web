// taskUtils.js - pure helpers for task UI calculations
export function clampPercent(p) {
  if (isNaN(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

export function percentOf(logged, estimated) {
  const l = Number(logged) || 0;
  const e = Number(estimated) || 0;
  if (e <= 0) return 0;
  return clampPercent(Math.round((l / e) * 100));
}

export function formatHours(h) {
  if (h === null || h === undefined) return '—';
  const n = Number(h);
  if (Number.isNaN(n)) return '—';
  return `${n}h`;
}
