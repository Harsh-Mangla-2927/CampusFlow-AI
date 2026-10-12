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

function RegisterPage({ onLogin, onGoLogin, onGoLanding }) {
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
      {/* ── LEFT PANEL ────────────────────────────────────── */}
      <div className="auth-left">
        <div className="auth-left-inner">
          <div className="auth-brand-badge">
            <span className="auth-brand-tag">Student Registration</span>
          </div>

          <div className="auth-headline">
            <span className="auth-headline-lg">Academic</span>
            <span className="auth-headline-lg">Intelligence</span>
            <span className="auth-headline-lg auth-headline-accent">Starts Here.</span>
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
                  <Layers size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Five Intelligence Engines</div>
                  <div className="auth-preview-item-desc">Priority scoring, risk alerts, conflict detector, study plans, action steps</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--success)' }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="auth-preview-item-title">Educational Email Protection</div>
                  <div className="auth-preview-item-desc">Restricted to verified university domains ({ALLOWED_DOMAINS.slice(0, 2).join(', ')})</div>
                </div>
              </div>

              <div className="auth-preview-item">
                <div className="auth-preview-item-icon" style={{ color: 'var(--info)' }}>
                  <BookOpen size={14} />
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

      {/* ── RIGHT PANEL ───────────────────────────────────── */}
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
                <h1>Create Account</h1>
                <p>Enroll with your educational university credentials.</p>
              </div>

          {errors.general && (
            <div className="alert alert-danger" role="alert" id="register-error-alert">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate id="form-register" autoComplete="on">
            {/* Full Name */}
            <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="reg-name">
                Full Name <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                type="text"
                value={f.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Harsh Mangla"
                autoComplete="name"
                required
                disabled={loading}
              />
              <FieldError msg={errors.name} />
            </div>

            {/* Educational Email */}
            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="reg-email">
                University Email <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="reg-email"
                className={`form-input ${errors.email ? 'input-error' : ''}`}
                type="email"
                value={f.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@chitkara.edu.in"
                autoComplete="email"
                required
                inputMode="email"
                disabled={loading}
              />
              <FieldError msg={errors.email} />
              {!errors.email && (
                <div className="field-hint">
                  Accepted domains: {ALLOWED_DOMAINS.join(', ')}
                </div>
              )}
            </div>

            {/* Password */}
            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="reg-password">
                Password <span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-with-icon">
                <input
                  id="reg-password"
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  value={f.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min. 8 chars (letters, numbers, symbols)"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldError msg={errors.password} />

              {/* Password strength bar */}
              {pwStrength && (
                <div className="pw-strength" aria-live="polite">
                  <div className="pw-strength-bar">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className="pw-strength-seg"
                        style={{
                          background: i <= pwStrength.score ? pwStrength.color : 'var(--border-strong)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="pw-strength-label" style={{ color: pwStrength.color }}>
                    Strength: {pwStrength.label}
                  </div>
                </div>
              )}

              {/* Requirements checklist */}
              {f.password && (
                <div className="pw-requirements" aria-label="Password requirements">
                  {[
                    { key: 'minLength', text: '8+ characters' },
                    { key: 'uppercase', text: 'Uppercase letter' },
                    { key: 'lowercase', text: 'Lowercase letter' },
                    { key: 'number',    text: 'Number' },
                    { key: 'special',   text: 'Special character' },
                  ].map(({ key, text }) => {
                    const met = pwStrength?.reqs?.[key];
                    return (
                      <div
                        key={key}
                        className={`pw-req ${met ? 'met' : ''}`}
                        aria-label={`${text}: ${met ? 'met' : 'not met'}`}
                      >
                        {met ? (
                          <CheckCircle size={11} aria-hidden="true" />
                        ) : (
                          <XCircle size={11} aria-hidden="true" />
                        )}
                        {text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={`form-group ${errors.confirmPassword ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="reg-confirm">
                Confirm Password <span className="required" aria-hidden="true">*</span>
              </label>
              <div className="input-with-icon">
                <input
                  id="reg-confirm"
                  className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  type={showCpw ? 'text' : 'password'}
                  value={f.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowCpw(p => !p)}
                  aria-label={showCpw ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={-1}
                >
                  {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <FieldError msg={errors.confirmPassword} />
              {f.confirmPassword && f.password === f.confirmPassword && !errors.confirmPassword && (
                <div className="field-success" role="status">
                  <CheckCircle size={12} aria-hidden="true" /> Passwords match
                </div>
              )}
            </div>

            {/* University + Course */}
            <div className="form-row">
              <div className={`form-group ${errors.university ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="reg-uni">
                  University <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-uni"
                  className={`form-input ${errors.university ? 'input-error' : ''}`}
                  type="text"
                  value={f.university}
                  onChange={e => set('university', e.target.value)}
                  placeholder="Chitkara University"
                  required
                  disabled={loading}
                />
                <FieldError msg={errors.university} />
              </div>

              <div className={`form-group ${errors.course ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="reg-course">
                  Course / Major <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="reg-course"
                  className={`form-input ${errors.course ? 'input-error' : ''}`}
                  type="text"
                  value={f.course}
                  onChange={e => set('course', e.target.value)}
                  placeholder="B.Tech CSE"
                  required
                  disabled={loading}
                />
                <FieldError msg={errors.course} />
              </div>
            </div>

            {/* Semester */}
            <div className={`form-group ${errors.semester ? 'has-error' : ''}`}>
              <label className="form-label" htmlFor="reg-semester">
                Semester <span className="required" aria-hidden="true">*</span>
              </label>
              <select
                id="reg-semester"
                className={`form-select ${errors.semester ? 'input-error' : ''}`}
                value={f.semester}
                onChange={e => set('semester', e.target.value)}
                required
                disabled={loading}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
              <FieldError msg={errors.semester} />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
              id="btn-register"
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Creating Account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account?{' '}
            <button
              className="auth-switch-link"
              onClick={onGoLogin}
              id="btn-go-login"
              type="button"
            >
              Sign In
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
