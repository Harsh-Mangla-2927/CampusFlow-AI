/**
 * Toast Notification System — CampusFlow AI
 *
 * Usage:
 *   import { useToast, ToastContainer } from '../components/Toast';
 *
 *   const { toast } = useToast();
 *   toast.success('Subject added.');
 *   toast.error('Something went wrong.');
 *   toast.info('Loading...');
 *   toast.warning('Attendance below threshold.');
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    if (!message) return null;
    const id = ++_toastId;
    setToasts(prev => {
      if (prev.some(t => t.message === message)) return prev;
      return [...prev.slice(-3), { id, message, type }];
    });
    if (duration > 0) setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur = 6000) => add(msg, 'error', dur),
    info:    (msg, dur) => add(msg, 'info', dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
    dismiss,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const TOAST_CONFIG = {
  success: { icon: CheckCircle,     color: 'var(--success)',  border: '1px solid rgba(34,197,94,0.3)',  bg: 'rgba(34,197,94,0.08)' },
  error:   { icon: AlertCircle,     color: 'var(--danger)',   border: '1px solid rgba(239,68,68,0.3)',  bg: 'rgba(239,68,68,0.08)' },
  info:    { icon: Info,            color: 'var(--accent)',   border: '1px solid rgba(232,255,0,0.2)',  bg: 'rgba(232,255,0,0.05)' },
  warning: { icon: AlertTriangle,   color: 'var(--warning)',  border: '1px solid rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.08)' },
};

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 400,
        width: 'calc(100vw - 48px)',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const cfg = TOAST_CONFIG[t.type] || TOAST_CONFIG.info;
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: cfg.border,
              backdropFilter: 'blur(8px)',
              animation: 'toastIn 0.2s ease',
              pointerEvents: 'all',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <Icon size={16} strokeWidth={2} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span style={{ fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5, flex: 1 }}>
              {t.message}
            </span>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              style={{ background: 'none', border: 'none', color: 'var(--fg-faint)', cursor: 'pointer', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center' }}
            >
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * Standalone toast — for pages that don't want to use context.
 * Renders its own container inside the component.
 */
export function useInlineToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur = 6000) => add(msg, 'error', dur),
    info:    (msg, dur) => add(msg, 'info', dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
  };

  const ToastPortal = () => <ToastContainer toasts={toasts} onDismiss={dismiss} />;

  return { toast, ToastPortal };
}
