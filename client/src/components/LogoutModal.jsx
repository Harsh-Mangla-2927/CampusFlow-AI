import React, { useEffect, useRef } from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';

export default function LogoutModal({ isOpen, onClose, onConfirm, loading = false, triggerRef }) {
  const modalBoxRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const confirmBtnRef = useRef(null);

  // Focus trap and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default for safety
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = modalBoxRef.current?.querySelectorAll(
          'button:not([disabled]), [tabindex="0"]'
        );
        if (!focusable || focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger element
      if (triggerRef?.current) {
        triggerRef.current.focus();
      }
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-desc"
    >
      <div
        className="modal-box"
        ref={modalBoxRef}
        style={{
          maxWidth: 440,
          background: 'var(--card, #0F0F0F)',
          border: '1px solid var(--border-medium, #262626)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-elevated, 0 16px 40px rgba(0,0,0,0.7))',
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle, #1F1F1F)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger, #EF4444)',
              }}
              aria-hidden="true"
            >
              <LogOut size={16} strokeWidth={2} />
            </div>
            <span
              className="modal-title"
              id="logout-modal-title"
              style={{
                fontFamily: 'var(--font-display, sans-serif)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--fg-primary, #FAFAFA)',
              }}
            >
              Sign out of CampusFlow AI?
            </span>
          </div>

          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            style={{ color: 'var(--fg-muted, #737373)' }}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px 24px' }}>
          <p
            id="logout-modal-desc"
            style={{
              fontSize: 13.5,
              lineHeight: 1.6,
              color: 'var(--fg-secondary, #A3A3A3)',
              margin: '0 0 20px',
            }}
          >
            You'll need to sign in again to access your academic workspace, active courses, tasks, and attendance analytics.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              ref={cancelBtnRef}
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              id="btn-logout-cancel"
              style={{ padding: '8px 18px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              className="btn btn-primary"
              onClick={onConfirm}
              disabled={loading}
              id="btn-logout-confirm"
              style={{
                padding: '8px 20px',
                fontSize: 13,
                background: 'var(--danger, #EF4444)',
                borderColor: 'var(--danger, #EF4444)',
                color: '#FFFFFF',
                fontWeight: 700,
                gap: 8,
              }}
            >
              <LogOut size={13} strokeWidth={2} aria-hidden="true" />
              {loading ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
