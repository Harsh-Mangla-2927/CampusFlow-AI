import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '../components/Toast';

function getPasswordStrength(pw) {
  const reqs = {
    minLength:  pw.length >= 8,
    uppercase:  /[A-Z]/.test(pw),
    lowercase:  /[a-z]/.test(pw),
    number:     /[0-9]/.test(pw),
    special:    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  };
  const score = Object.values(reqs).filter(Boolean).length;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['', 'var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--success)', 'var(--success)'];
  return { reqs, score, label: labels[score] || '', color: colors[score] || 'var(--fg-faint)' };
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

export default function ResetPasswordPage({ token: initialToken, onGoLogin, onGoForgotPassword }) {
  const { toast } = useToast();
  // Resilient token extraction from prop, search param, or hash
  const token = (
    initialToken ||
    new URLSearchParams(window.location.search).get('token') ||
    (window.location.hash && window.location.hash.includes('token=')
      ? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?'))).get('token')
      : '') ||
    ''
  ).trim();

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [showCpw, setShowCpw]                 = useState(false);
  const [errors, setErrors]                   = useState({});
  const [loading, setLoading]                 = useState(false);
  const [pwStrength, setPwStrength]           = useState(null);
  const [resetSuccess, setResetSuccess]       = useState(false);

  const handlePasswordChange = (val) => {
    setPassword(val);
    setPwStrength(val ? getPasswordStrength(val) : null);
    setErrors(prev => ({ ...prev, password: '', general: '' }));
  };

  const handleConfirmChange = (val) => {
    setConfirmPassword(val);
    setErrors(prev => ({ ...prev, confirmPassword: '', general: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!token) {
      errs.general = 'Password reset token is missing from link. Please request a new link.';
      return errs;
    }
    if (!password) {
      errs.password = 'New password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (pwStrength?.score < 3) {
      errs.password = 'Password is too weak. Include uppercase, numbers, or symbols.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Password confirmation is required.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authAPI.resetPassword({
        token,
        password,
        confirmPassword,
      });

      setResetSuccess(true);
      toast.success('Password reset successfully! Please sign in with your new password.');
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'Failed to reset password. Token may have expired.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── LEFT PANEL: CINEMATIC BRAND EXPERIENCE ────────── */}
      <aside className="auth-left" aria-label="CampusFlow AI Password Reset Overview">
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
              <span className="auth-brand-tag">Access Key Rotation</span>
            </div>
            <div className="auth-headline">
              <h1 className="auth-headline-title">
                Secure<br />
                <span className="auth-headline-accent">Credential.</span>
              </h1>
            </div>
            <p className="auth-tagline">
              Set a resilient password to protect your academic records, attendance logs, and study planning data.
            </p>
          </div>

          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-card-header">
              <div className="auth-preview-card-dot" />
              <span>Password Security Standards · Deterministic</span>
            </div>

            <div className="auth-preview-items">
              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <Lock size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">12-Round Salt Hashing</div>
                  <div className="auth-preview-item-desc">Passwords are encrypted via bcrypt and never stored in plaintext</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--teal)' }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Immediate Invalidation</div>
                  <div className="auth-preview-item-desc">Used reset tokens are permanently discarded to block replay attacks</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <span>CampusFlow AI · Academic Intelligence · v2.4.0</span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL: RESET PASSWORD FORM ─────────────────── */}
      <main className="auth-right">
        <div className="auth-form-container">
          <button
            className="auth-back-link"
            onClick={onGoLogin}
            id="btn-reset-back-login"
            type="button"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to Sign In
          </button>

          <div className="auth-form-header">
            <div className="auth-logo-mark" aria-hidden="true">CF</div>
            <h2 className="auth-form-title">Create a New Password</h2>
            <p className="auth-form-sub">Enter your new strong password below to regain access to your account.</p>
          </div>

          {!token && (
            <div className="alert alert-danger" role="alert" id="missing-token-alert" style={{ marginBottom: 20 }}>
              Password reset link is missing a valid token. Please request a new link from the forgot password page.
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="auth-submit-btn"
                  onClick={onGoForgotPassword}
                  style={{ fontSize: '11px', height: '36px', width: 'auto', padding: '0 16px', display: 'inline-flex' }}
                >
                  Request New Link →
                </button>
              </div>
            </div>
          )}

          {errors.general && (
            <div className="alert alert-danger" role="alert" id="reset-error-alert" style={{ marginBottom: 20 }}>
              {errors.general}
            </div>
          )}

          {resetSuccess ? (
            <div className="auth-confirmation-box" style={{ background: '#111111', border: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ color: 'var(--accent)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--fg-primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                Password Updated
              </h2>
              <p style={{ color: 'var(--fg-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: 24 }}>
                Your password has been reset successfully. You can now sign in with your new password. (Email OTP verification will be requested as usual).
              </p>
              <button
                type="button"
                className="auth-submit-btn"
                onClick={onGoLogin}
                id="btn-goto-signin"
                style={{ marginTop: 0 }}
              >
                Sign In Now →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate id="form-reset-password" autoComplete="on">
              {/* New Password */}
              <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="reset-new-password">
                  New Password <span className="form-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-new-password"
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter new strong password"
                    autoComplete="new-password"
                    required
                    disabled={loading || !token}
                    autoFocus
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPw(p => !p)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError msg={errors.password} />

                {/* Password strength indicator */}
                {pwStrength && (
                  <div className="pw-strength-bar-wrap" style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--fg-muted)' }}>Strength:</span>
                      <span style={{ color: pwStrength.color, fontWeight: 700 }}>{pwStrength.label}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, height: 4 }}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          style={{
                            height: '100%',
                            borderRadius: 0,
                            background: level <= pwStrength.score ? pwStrength.color : 'rgba(255,255,255,0.06)',
                            transition: 'background 0.2s',
                          }}
                        />
                      ))}
                    </div>

                    <div className="pw-requirements-list" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: pwStrength.reqs.minLength ? 'var(--success)' : 'var(--fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {pwStrength.reqs.minLength ? <CheckCircle2 size={11} /> : <XCircle size={11} />} 8+ chars
                      </span>
                      <span style={{ color: pwStrength.reqs.uppercase ? 'var(--success)' : 'var(--fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {pwStrength.reqs.uppercase ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Uppercase
                      </span>
                      <span style={{ color: pwStrength.reqs.number ? 'var(--success)' : 'var(--fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {pwStrength.reqs.number ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Number
                      </span>
                      <span style={{ color: pwStrength.reqs.special ? 'var(--success)' : 'var(--fg-faint)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {pwStrength.reqs.special ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Symbol
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="reset-confirm-password">
                  Confirm New Password <span className="form-required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-confirm-password"
                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    type={showCpw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => handleConfirmChange(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    required
                    disabled={loading || !token}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowCpw(p => !p)}
                    aria-label={showCpw ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <FieldError msg={errors.confirmPassword} />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading || !token}
                id="btn-submit-reset-password"
              >
                {loading ? 'Resetting Password…' : 'Reset Password →'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
