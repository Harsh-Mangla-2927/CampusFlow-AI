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
      {/* ── LEFT PANEL: BRANDING & PRODUCT PREVIEW ────────────── */}
      <div className="auth-left">
        <div className="auth-left-bg" aria-hidden="true">
          <img
            src="/auth-space.jpg"
            alt=""
            className="auth-bg-img"
          />
          <div className="auth-bg-overlay" />
        </div>

        <div className="auth-left-inner">
          <div className="auth-brand-badge">
            <span className="auth-brand-tag">Academic Intelligence OS</span>
          </div>

          <div className="auth-headline">
            <h1 className="auth-headline-title">
              Welcome <span className="auth-headline-accent">Back.</span>
            </h1>
          </div>

          <p className="auth-tagline">
            Log in to access your prioritized tasks, attendance health tracking, and conflict-free study schedule.
          </p>

          {/* Micro preview card */}
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-card-header">
              <div className="auth-preview-card-dot" />
              <span>CampusFlow Intelligence Snapshot</span>
            </div>

            <div className="auth-preview-items">
              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--amber)' }}>
                  <Zap size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Priority Queue Active</div>
                  <div className="auth-preview-item-desc">Top task: DBMS Assignment (Score 87 · Due in 2d)</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--teal)' }}>
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Academic Health: 88% Optimal</div>
                  <div className="auth-preview-item-desc">4 of 5 subjects securely above 75% attendance</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--amber)' }}>
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Exam Proximity Alert</div>
                  <div className="auth-preview-item-desc">DSA Module Test 3 approaching in 5 days</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <span>© 2026 CampusFlow AI · Transparent rule-based intelligence</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: SIGN-IN FORM OR OTP VERIFICATION ──────── */}
      <div className="auth-right">
        <div className="auth-form-container">
          {otpStep ? (
            <OtpVerificationForm
              challengeToken={challengeData.challengeToken}
              maskedEmail={challengeData.maskedEmail}
              resendCooldownSeconds={challengeData.resendCooldownSeconds}
              title="VERIFY YOUR EMAIL"
              subtitle="We've sent a verification code to your email address."
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
                <ArrowLeft size={13} style={{ marginRight: 6 }} aria-hidden="true" />
                Back to Home
              </button>

              <div className="auth-form-header">
                <div className="auth-logo-mark" aria-hidden="true">CF</div>
                <h2 className="auth-form-title">Sign In</h2>
                <p className="auth-form-sub">Access your CampusFlow AI student workspace.</p>
              </div>

              {errors.general && (
                <div className="alert alert-danger" role="alert" id="login-error-alert" style={{ marginBottom: 18 }}>
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate id="form-login" autoComplete="on">
                <div className={`form-group ${errors.email ? 'has-error' : ''}`} style={{ marginBottom: 18 }}>
                  <label className="form-label" htmlFor="login-email">
                    University Email
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

                <div className={`form-group ${errors.password ? 'has-error' : ''}`} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" htmlFor="login-password" style={{ marginBottom: 0 }}>
                      Password
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
                      tabIndex={-1}
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
                  style={{ marginTop: 14 }}
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
      </div>
    </div>
  );
}
