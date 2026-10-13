import React, { useState } from 'react';
import { authAPI, saveAuth } from '../services/api';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '../components/Toast';
import OtpVerificationForm from '../components/OtpVerificationForm';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

export default function LoginPage({ onLogin, onGoRegister, onGoLanding, onGoForgotPassword }) {
  const { toast } = useToast();
  const [f, setF]             = useState({ email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  // OTP Step State
  const [otpStep, setOtpStep] = useState(false);
  const [challengeData, setChallengeData] = useState({
    challengeToken: '',
    maskedEmail: '',
    resendCooldownSeconds: 60,
  });

  const set = (k, v) => {
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '', general: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!f.email.trim()) {
      errs.email = 'University email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!f.password) {
      errs.password = 'Password is required.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await authAPI.login({
        email: f.email.trim().toLowerCase(),
        password: f.password,
      });

      if (res.requireOtp) {
        setChallengeData({
          challengeToken: res.challengeToken,
          maskedEmail: res.maskedEmail,
          resendCooldownSeconds: res.resendCooldownSeconds || 60,
        });
        setOtpStep(true);
        toast.success('Verification code sent to your email.');
        return;
      }

      // Fallback if legacy response without OTP
      if (res.data?.token && res.data?.user) {
        saveAuth(res.data.token, res.data.user);
        toast.success(`Welcome back, ${res.data.user.name?.split(' ')[0] || 'Student'}.`);
        onLogin(res.data.user);
      }
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'Invalid email or password.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── LEFT PANEL: CINEMATIC BRAND EXPERIENCE ────────── */}
      <aside className="auth-left" aria-label="CampusFlow AI Overview">
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
              <span className="auth-brand-tag">Academic Intelligence System</span>
            </div>
            <div className="auth-headline">
              <h1 className="auth-headline-title">
                Your semester.<br />
                In better <span className="auth-headline-accent">focus.</span>
              </h1>
            </div>
            <p className="auth-tagline">
              Bring deadlines, attendance thresholds, exam prep, and daily study priorities into
              one clear, explainable academic workspace.
            </p>
          </div>

          {/* Real Telemetry Snapshot */}
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-card-header">
              <div className="auth-preview-card-dot" />
              <span>System Telemetry · Deterministic</span>
            </div>

            <div className="auth-preview-items">
              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <Zap size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Priority Queue Engine</div>
                  <div className="auth-preview-item-desc">Scores obligations (0–100) via 4 explainable weights</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--teal)' }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Attendly Health Monitor</div>
                  <div className="auth-preview-item-desc">Audits 75% cutoff & calculates exact recovery lectures</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <AlertTriangle size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Collision Defense Radar</div>
                  <div className="auth-preview-item-desc">48-hr forward scanning prevents overlapping evaluation stress</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <span>CampusFlow AI · Academic Intelligence · v2.4.0</span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL: FOCUSED SIGN-IN FORM ──────────────── */}
      <main className="auth-right">
        <div className="auth-form-container">
          {otpStep ? (
            <OtpVerificationForm
              challengeToken={challengeData.challengeToken}
              maskedEmail={challengeData.maskedEmail}
              resendCooldownSeconds={challengeData.resendCooldownSeconds}
              title="VERIFY YOUR EMAIL"
              subtitle="We've sent a 6-digit verification code to your email address."
              onSuccess={(authData) => {
                toast.success(`Welcome back, ${authData.user.name?.split(' ')[0] || 'Student'}.`);
                onLogin(authData.user);
              }}
              onBack={() => {
                setOtpStep(false);
              }}
            />
          ) : (
            <>
              <button
                className="auth-back-link"
                onClick={onGoLanding}
                id="btn-go-landing"
                type="button"
              >
                <ArrowLeft size={13} aria-hidden="true" />
                Back to Home
              </button>

              <div className="auth-form-header">
                <div className="auth-logo-mark" aria-hidden="true">CF</div>
                <h2 className="auth-form-title">Welcome back.</h2>
                <p className="auth-form-sub">Sign in to continue to your academic workspace.</p>
              </div>

              {errors.general && (
                <div className="alert alert-danger" role="alert" id="login-error-alert" style={{ marginBottom: 18 }}>
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate id="form-login" autoComplete="on">
                <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                  <label className="form-label" htmlFor="login-email">
                    University Email <span className="form-required">*</span>
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="form-input"
                    placeholder="student@chitkara.edu.in"
                    value={f.email}
                    onChange={(e) => set('email', e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                  <FieldError msg={errors.email} />
                </div>

                <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                      Password <span className="form-required">*</span>
                    </label>
                    {onGoForgotPassword && (
                      <button
                        type="button"
                        onClick={onGoForgotPassword}
                        className="auth-forgot-link"
                        id="btn-forgot-password"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      className="form-input"
                      placeholder="••••••••"
                      value={f.password}
                      onChange={(e) => set('password', e.target.value)}
                      disabled={loading}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <FieldError msg={errors.password} />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  id="btn-login-submit"
                >
                  {loading ? 'Authenticating…' : 'Sign In →'}
                </button>
              </form>

              <div className="auth-footer-prompt">
                <span>New to CampusFlow AI?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={onGoRegister}
                  id="btn-switch-register"
                >
                  Create an account →
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
