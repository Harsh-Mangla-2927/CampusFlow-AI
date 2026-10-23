/* ── HELPERS.JS ─────────────────────────────────────────── */

/**
 * Returns greeting based on local hour
 */
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format a date string.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} opts
 * @returns {string}
 */
export function formatDate(date, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', opts);
  } catch {
    return '—';
  }
}

/**
 * Human-readable deadline label.
 * Accepts either `deadline` or `dueDate` field name.
 * @param {string|Date} date
 */
export function deadlineLabel(date) {
  if (!date) return 'No deadline';
  const target = new Date(date);
  if (isNaN(target.getTime())) return 'No deadline';
  const days = Math.ceil((target - new Date()) / 86400000);
  if (days < 0)   return `${Math.abs(days)}d overdue`;
  if (days === 0)  return 'Due today';
  if (days === 1)  return 'Due tomorrow';
  if (days <= 7)   return `Due in ${days}d`;
  return `Due ${formatDate(target, { day: 'numeric', month: 'short' })}`;
}

/**
 * CSS class for priority badge
 */
export function getPriorityBadgeClass(level) {
  if (!level) return 'badge badge-neutral';
  const l = level.toUpperCase();
  if (l === 'HIGH')   return 'badge badge-high';
  if (l === 'MEDIUM') return 'badge badge-medium';
  if (l === 'LOW')    return 'badge badge-low';
  return 'badge badge-neutral';
}

/**
 * Returns attendance info object
 */
export function getAttendanceInfo(attended, total, threshold = 75) {
  const safeAttended = Math.max(0, safeNum(attended));
  const safeTotal = Math.max(0, safeNum(total));
  if (safeTotal === 0) return { pct: 0, color: 'var(--fg-faint)', status: 'NO_DATA', label: 'No Classes' };
  const pct = Math.round((safeAttended / safeTotal) * 100);
  if (pct >= threshold + 5) return { pct, color: 'var(--success)', status: 'SAFE',     label: 'Safe' };
  if (pct >= threshold)     return { pct, color: 'var(--warning)', status: 'WARNING',  label: 'Warning' };
  return                           { pct, color: 'var(--danger)',  status: 'CRITICAL', label: 'Critical' };
}

/**
 * Health score color
 */
export function getHealthColor(score) {
  if (score >= 75) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

/**
 * Clamp a number between min and max
 */
export function clamp(val, min = 0, max = 100) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Safe number — returns 0 if value is null/undefined/NaN
 */
export function safeNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}
