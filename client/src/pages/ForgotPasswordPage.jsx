import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { ArrowLeft, Mail, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

const ALLOWED_DOMAINS = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS || 'chitkara.edu.in,chitkara.ac.in,campusflow.ai')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);

function checkEmailDomain(email) {
  if (!ALLOWED_DOMAINS.length) return true;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

export default function ForgotPasswordPage({ onGoLogin, onGoLanding }) {
  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validate = () => {
    if (!email.trim()) {
      return 'University email is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!checkEmailDomain(email.trim())) {
      return `Please enter your registered university email (${ALLOWED_DOMAINS.join(' or ')}).`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authAPI.forgotPassword({ email: email.trim().toLowerCase() });
      setSuccessMsg(res.message || 'If an account exists for that email address, password reset instructions will be sent if the account is eligible.');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── LEFT PANEL: CINEMATIC BRAND EXPERIENCE ────────── */}
      <aside className="auth-left" aria-label="CampusFlow AI Account Recovery Overview">
        <div className="auth-left-bg" aria-hidden="true">
          <img
            src="/auth-space.jpg"
            alt=""
            className="auth-bg-img"
          />
          <div className="auth-bg-overlay" />
        </div>

        <div className="auth-left-inner">
          <div className="auth-left-top">
            <div className="auth-brand-badge">
              <span className="auth-brand-tag">Academic Security Protocol</span>
            </div>
            <div className="auth-headline">
              <h1 className="auth-headline-title">
                Account<br />
                <span className="auth-headline-accent">Recovery.</span>
              </h1>
            </div>
            <p className="auth-tagline">
              Reset your access credentials securely using your verified institutional educational email address.
            </p>
          </div>

          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-card-header">
              <div className="auth-preview-card-dot" />
              <span>Security Assurance · Deterministic</span>
            </div>

            <div className="auth-preview-items">
              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Cryptographic Reset Tokens</div>
                  <div className="auth-preview-item-desc">Single-use, SHA-256 hashed tokens with 15-minute expiration windows</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--teal)' }}>
                  <Zap size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Two-Factor Protected</div>
                  <div className="auth-preview-item-desc">Subsequent sign-ins continue to enforce 2-step Email OTP verification</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <span>CampusFlow AI · Academic Intelligence · v2.4.0</span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL: FORGOT PASSWORD FORM ────────────────── */}
      <main className="auth-right">
        <div className="auth-form-container">
          <button
            className="auth-back-link"
            onClick={onGoLogin}
            id="btn-back-login"
            type="button"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Sign In
          </button>

          <div className="auth-form-header">
            <div className="auth-logo-mark" aria-hidden="true">CF</div>
            <h2 className="auth-form-title">Forgot your password?</h2>
            <p className="auth-form-sub">Enter your registered university email. We'll send you instructions to securely reset your password.</p>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert" id="forgot-error-alert" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {submitted ? (
            <div className="auth-confirmation-box" style={{ background: '#111111', border: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--fg-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                Instructions Dispatched
              </h2>
              <p style={{ color: 'var(--fg-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: 24 }}>
                {successMsg}
              </p>
              <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: 24 }}>
                Please check your inbox (and spam folder) for the secure 15-minute reset link.
              </div>
              <button
                type="button"
                className="auth-submit-btn"
                onClick={onGoLogin}
                id="btn-return-signin"
                style={{ marginTop: 0 }}
              >
                Return to Sign In →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate id="form-forgot-password" autoComplete="on">
              <div className={`form-group ${error ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="forgot-email">
                  University Email <span className="form-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="forgot-email"
                    className={`form-input ${error ? 'input-error' : ''}`}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="student@chitkara.edu.in"
                    autoComplete="email"
                    required
                    inputMode="email"
                    disabled={loading}
                    autoFocus
                    style={{ paddingRight: 40 }}
                  />
                  <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--fg-muted)' }} aria-hidden="true">
                    <Mail size={15} />
                  </div>
                </div>
                <FieldError msg={error} />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
                id="btn-send-reset-link"
              >
                {loading ? 'Sending Reset Link…' : 'Send Reset Link →'}
              </button>

              <div className="auth-footer-prompt">
                <span>Remember your password?</span>
                <button
                  className="auth-switch-link"
                  onClick={onGoLogin}
                  id="btn-switch-login"
                  type="button"
                >
                  Sign In →
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
