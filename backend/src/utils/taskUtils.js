// taskUtils.js - pure helpers for task calculations
function computeAutoProgress(loggedHours, estimatedHours) {
  if (!estimatedHours || estimatedHours <= 0) return 0;
  const ratio = loggedHours / estimatedHours;
  return Math.min(100, Math.round(ratio * 100));
}

module.exports = { computeAutoProgress };
