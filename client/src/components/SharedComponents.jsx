import React from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

/* ── LOADING STATE ──────────────────────────────────────── */
export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="state-wrapper" role="status" aria-live="polite">
      <div className="loading-dots" aria-hidden="true">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
      <p className="state-desc" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
        {message}
      </p>
    </div>
  );
}

/* ── ERROR STATE ────────────────────────────────────────── */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-wrapper" role="alert">
      <div className="state-icon" style={{ borderColor: 'var(--danger-border)', color: 'var(--danger)' }}>
        <AlertTriangle size={20} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="state-title" style={{ color: 'var(--danger)', fontSize: 18 }}>Error</div>
      <p className="state-desc">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry} id="btn-retry">
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

/* ── EMPTY STATE ────────────────────────────────────────── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="state-wrapper" role="region" aria-label={title || 'Empty state'}>
      {icon && (
        <div className="state-icon" aria-hidden="true">{icon}</div>
      )}
      <div className="state-title">{title}</div>
      {description && <p className="state-desc">{description}</p>}
      {action}
    </div>
  );
}

/* ── MODAL ──────────────────────────────────────────────── */
export function Modal({ isOpen, onClose, title, children, maxWidth = 560 }) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-box" style={{ maxWidth, borderRadius: 'var(--r-none, 0px)' }}>
        <div className="modal-header">
          <span className="modal-title" id="modal-title">{title}</span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
            id="btn-modal-close"
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ── STAT CARD ──────────────────────────────────────────── */
export function StatCard({ label, value, accentColor, icon, detail }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {icon && (
          <div className="stat-card-icon" style={{ color: accentColor || 'var(--accent)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="stat-card-label" style={{ fontFamily: 'var(--font-mono)' }}>{label}</div>
      <div className="stat-card-value" style={{ color: accentColor || 'var(--fg-primary)' }}>
        {value}
      </div>
      {detail && <div className="stat-card-detail" style={{ fontFamily: 'var(--font-mono)' }}>{detail}</div>}
    </div>
  );
}

/* ── PROGRESS BAR ───────────────────────────────────────── */
export function ProgressBar({ value = 0, color = 'var(--accent)', label }) {
  const numericVal = typeof value === 'number' ? value : parseFloat(value);
  const safeVal = Number.isFinite(numericVal) ? numericVal : 0;
  const clamped = Math.min(100, Math.max(0, safeVal));
  const rounded = Math.round(clamped);

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{rounded}%</span>
        </div>
      )}
      <div
        className="progress-bar-wrapper"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${rounded}%`}
        aria-label={label || 'Progress'}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── SECTION HEADER ─────────────────────────────────────── */
export function SectionHeader({ overline, title, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 'var(--s4)',
      marginBottom: 'var(--s5)',
      paddingBottom: 'var(--s4)',
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      <div>
        {overline && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            {overline}
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--fg-primary)', lineHeight: 1 }}>
          {title}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ── ACADEMIC HEALTH RING ───────────────────────────────── */
export function AcademicHealthRing({ score, size = 100 }) {
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="health-ring" aria-label={`Academic health: ${score}%`}>
      <svg className="health-ring-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth={6} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="square"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s var(--ease)' }}
        />
      </svg>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {score}%
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-secondary)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          Academic Health
        </div>
      </div>
    </div>
  );
}
