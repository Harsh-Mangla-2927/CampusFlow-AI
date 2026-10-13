import React, { useState } from 'react';
import { authAPI, saveAuth } from '../services/api';
import { Eye, EyeOff, CheckCircle, XCircle, ArrowLeft, ShieldCheck, BookOpen, Layers } from 'lucide-react';
import { useToast } from '../components/Toast';
import OtpVerificationForm from '../components/OtpVerificationForm';

const ALLOWED_DOMAINS = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS || 'chitkara.edu.in,chitkara.ac.in,campusflow.ai')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);

function checkEmailDomain(email) {
  if (!ALLOWED_DOMAINS.length) return true;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`));
}

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

export default function RegisterPage({ onLogin, onGoLogin, onGoLanding }) {
  const { toast } = useToast();
  const [loading, setLoading]       = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [showCpw, setShowCpw]       = useState(false);
  const [pwStrength, setPwStrength] = useState(null);

  // OTP Step State
  const [otpStep, setOtpStep] = useState(false);
  const [challengeData, setChallengeData] = useState({
    challengeToken: '',
    maskedEmail: '',
    resendCooldownSeconds: 60,
  });

  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
    course: '',
    semester: '1',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setF(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '', general: '' }));
    if (k === 'password') setPwStrength(v ? getPasswordStrength(v) : null);
  };

  const validate = () => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Full name is required.';
    if (!f.email.trim()) {
      errs.email = 'University educational email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      errs.email = 'Please enter a valid email address.';
    } else if (!checkEmailDomain(f.email)) {
      errs.email = `Please use your university email (${ALLOWED_DOMAINS.join(' or ')}).`;
    }
    if (!f.password) {
      errs.password = 'Password is required.';
    } else if (f.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    } else if (pwStrength?.score < 3) {
      errs.password = 'Password is too weak. Add uppercase, numbers, or symbols.';
    }
    if (f.password !== f.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!f.university.trim()) errs.university = 'University name is required.';
    if (!f.course.trim()) errs.course = 'Course name is required.';
    if (!f.semester) errs.semester = 'Please select your semester.';
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
      const res = await authAPI.register({
        name: f.name.trim(),
        email: f.email.trim().toLowerCase(),
        password: f.password,
        confirmPassword: f.confirmPassword,
        university: f.university.trim(),
        course: f.course.trim(),
        semester: Number(f.semester),
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

      if (res.data?.token && res.data?.user) {
        saveAuth(res.data.token, res.data.user);
        toast.success('Account created! Welcome to CampusFlow AI.');
        onLogin(res.data.user);
      }
    } catch (err) {
      if (err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setErrors({ general: err.message || 'Registration failed. Please check your details.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── LEFT PANEL: REGISTRATION VALUE PROPOSITION ────────── */}
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
            <span className="auth-brand-tag">Student Registration</span>
          </div>

          <div className="auth-headline">
            <h1 className="auth-headline-title">
              Academic Intelligence <span className="auth-headline-accent">Starts Here.</span>
            </h1>
          </div>

          <p className="auth-tagline">
            Connect your subjects, track attendance thresholds, predict exam bottlenecks, and eliminate deadline conflicts.
          </p>

          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-card-header">
              <div className="auth-preview-card-dot" />
              <span>What You Get Upon Joining</span>
            </div>

            <div className="auth-preview-items">
              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <Layers size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Six Autonomous Engines</div>
                  <div className="auth-preview-item-desc">Priority scoring, risk alerts, collision defense, study plans, action steps</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--teal)' }}>
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Educational Email Protection</div>
                  <div className="auth-preview-item-desc">Restricted to verified university domains ({ALLOWED_DOMAINS.slice(0, 2).join(', ')})</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--accent)' }}>
                  <BookOpen size={15} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Course-Aligned Tracking</div>
                  <div className="auth-preview-item-desc">Configured for your exact semester, syllabus, and credit load</div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-left-footer">
            <span>© 2026 CampusFlow AI · Academic Life, Intelligently Organized</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: REGISTRATION FORM OR OTP VERIFICATION ── */}
      <div className="auth-right">
        <div className="auth-form-container">
          {otpStep ? (
            <OtpVerificationForm
              challengeToken={challengeData.challengeToken}
              maskedEmail={challengeData.maskedEmail}
              resendCooldownSeconds={challengeData.resendCooldownSeconds}
              title="VERIFY YOUR EMAIL"
              subtitle="We've sent a verification code to complete your registration."
              onSuccess={(authData) => {
                toast.success('Account verified! Welcome to CampusFlow AI.');
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
                <h2 className="auth-form-title">Create Account</h2>
                <p className="auth-form-sub">Join CampusFlow AI with your university email.</p>
              </div>

              {errors.general && (
                <div className="alert alert-danger" role="alert" id="register-error-alert" style={{ marginBottom: 18 }}>
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate id="form-register" autoComplete="on">
                <div className={`form-group ${errors.name ? 'has-error' : ''}`} style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="reg-name">
                    Full Name <span className="form-required">*</span>
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    className="form-input"
                    placeholder="Harsh Mangla"
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    disabled={loading}
                  />
                  <FieldError msg={errors.name} />
                </div>

                <div className={`form-group ${errors.email ? 'has-error' : ''}`} style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="reg-email">
                    University Email <span className="form-required">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="form-input"
                    placeholder="student@chitkara.edu.in"
                    value={f.email}
                    onChange={(e) => set('email', e.target.value)}
                    disabled={loading}
                  />
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                    Must end with: {ALLOWED_DOMAINS.join(', ')}
                  </div>
                  <FieldError msg={errors.email} />
                </div>

                {/* University and Course in a balanced 2-column row */}
                <div className="auth-form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div className={`form-group ${errors.university ? 'has-error' : ''}`} style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="reg-university">
                      University <span className="form-required">*</span>
                    </label>
                    <input
                      id="reg-university"
                      type="text"
                      className="form-input"
                      placeholder="Chitkara University"
                      value={f.university}
                      onChange={(e) => set('university', e.target.value)}
                      disabled={loading}
                    />
                    <FieldError msg={errors.university} />
                  </div>

                  <div className={`form-group ${errors.course ? 'has-error' : ''}`} style={{ marginBottom: 0 }}>
                    <label className="form-label" htmlFor="reg-course">
                      Course / Major <span className="form-required">*</span>
                    </label>
                    <input
                      id="reg-course"
                      type="text"
                      className="form-input"
                      placeholder="B.Tech CSE"
                      value={f.course}
                      onChange={(e) => set('course', e.target.value)}
                      disabled={loading}
                    />
                    <FieldError msg={errors.course} />
                  </div>
                </div>

                <div className={`form-group ${errors.semester ? 'has-error' : ''}`} style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="reg-semester">
                    Current Semester <span className="form-required">*</span>
                  </label>
                  <select
                    id="reg-semester"
                    className="form-select"
                    value={f.semester}
                    onChange={(e) => set('semester', e.target.value)}
                    disabled={loading}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>
                  <FieldError msg={errors.semester} />
                </div>

                <div className={`form-group ${errors.password ? 'has-error' : ''}`} style={{ marginBottom: 16 }}>
                  <label className="form-label" htmlFor="reg-password">
                    Password <span className="form-required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-password"
                      type={showPw ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      className="form-input"
                      placeholder="Min. 8 chars, uppercase & numbers"
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
                  {pwStrength && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(pwStrength.score / 5) * 100}%`,
                          height: '100%',
                          background: pwStrength.color,
                          transition: 'all 0.2s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: pwStrength.color, fontWeight: 600 }}>
                        {pwStrength.label}
                      </span>
                    </div>
                  )}
                  <FieldError msg={errors.password} />
                </div>

                <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`} style={{ marginBottom: 20 }}>
                  <label className="form-label" htmlFor="reg-confirmPassword">
                    Confirm Password <span className="form-required">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-confirmPassword"
                      type={showCpw ? 'text' : 'password'}
                      name="confirm-password"
                      autoComplete="new-password"
                      className="form-input"
                      placeholder="Re-enter password"
                      value={f.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      disabled={loading}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCpw((v) => !v)}
                      aria-label={showCpw ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <FieldError msg={errors.confirmPassword} />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                  id="btn-register-submit"
                >
                  {loading ? 'Creating Account…' : 'Create Account →'}
                </button>
              </form>

              <div className="auth-footer-prompt">
                <span>Already have an account?</span>
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={onGoLogin}
                  id="btn-switch-login"
                >
                  Sign in here →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
