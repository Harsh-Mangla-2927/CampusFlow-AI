import React, { useState, useEffect, useRef } from 'react';
import { authAPI, saveAuth } from '../services/api';
import { ArrowLeft, Mail, Clock, RefreshCw } from 'lucide-react';
import { useToast } from './Toast';

export default function OtpVerificationForm({
  challengeToken: initialChallengeToken,
  maskedEmail,
  resendCooldownSeconds = 60,
  onSuccess,
  onBack,
  title = 'VERIFY YOUR EMAIL',
  subtitle = "We've sent a verification code to your email address.",
}) {
  const { toast } = useToast();
  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // 5-minute code expiration countdown (300 seconds)
  const [expirySeconds, setExpirySeconds] = useState(300);
  // Resend cooldown countdown (default 60 seconds)
  const [cooldownSeconds, setCooldownSeconds] = useState(resendCooldownSeconds);

  const inputRefs = useRef([]);

  // Auto-focus first input on load
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Expiry countdown effect
  useEffect(() => {
    if (expirySeconds <= 0) return;
    const timer = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expirySeconds]);

  // Cooldown countdown effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleanValue.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    // Advance focus to next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move back and clear previous input
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1].focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    setError('');

    // Focus last filled index or submit if full 6 digits
    const targetIdx = Math.min(pasted.length, 5);
    inputRefs.current[targetIdx]?.focus();

    if (pasted.length === 6) {
      submitOtpCode(pasted);
    }
  };

  const submitOtpCode = async (codeToVerify) => {
    const fullOtp = codeToVerify || digits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (expirySeconds <= 0) {
      setError('Your verification code has expired. Request a new code.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const res = await authAPI.verifyOtp({
        challengeToken,
        otp: fullOtp,
      });

      if (res.data?.token && res.data?.user) {
        saveAuth(res.data.token, res.data.user);
        onSuccess(res.data);
      } else {
        setError('Verification completed but session could not be established.');
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    submitOtpCode();
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || resending) return;

    setResending(true);
    setError('');

    try {
      const res = await authAPI.resendOtp({
        challengeToken,
      });

      if (res.challengeToken) {
        setChallengeToken(res.challengeToken);
      }
      setExpirySeconds(300); // Reset 5-min timer
      setCooldownSeconds(res.resendCooldownSeconds || 60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast.success('A new verification code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="otp-container">
      <button
        className="auth-back-link"
        onClick={onBack}
        id="btn-otp-back"
        type="button"
      >
        <ArrowLeft size={13} style={{ marginRight: 6 }} aria-hidden="true" />
        Change Email / Back
      </button>

      <div className="otp-screen-header">
        <div className="auth-logo-mark" aria-hidden="true">CF</div>
        <h1 style={{ textTransform: 'uppercase', letterSpacing: '-0.02em', fontSize: '26px', fontWeight: 900 }}>
          {title}
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: '14px', marginTop: 4 }}>
          {subtitle}
        </p>

        {maskedEmail && (
          <div className="otp-badge-wrap" id="otp-masked-email-badge">
            <Mail size={14} style={{ color: 'var(--accent)' }} />
            <span className="otp-badge-text">{maskedEmail}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" id="otp-error-alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleVerifySubmit} noValidate id="form-otp-verify">
        <div className="otp-inputs-grid" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              id={`otp-input-${idx}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              className={`otp-input-box ${digit ? 'filled' : ''}`}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={verifying}
              aria-label={`Digit ${idx + 1} of verification code`}
            />
          ))}
        </div>

        <div className="otp-meta-bar">
          <div className={`otp-countdown ${expirySeconds <= 60 ? 'expired' : ''}`}>
            <Clock size={13} />
            <span>
              {expirySeconds > 0
                ? `Expires in ${formatTime(expirySeconds)}`
                : 'Code expired'}
            </span>
          </div>

          <div>
            {cooldownSeconds > 0 ? (
              <span style={{ color: 'var(--fg-faint)', fontSize: '11px' }}>
                Resend in {cooldownSeconds}s
              </span>
            ) : (
              <button
                type="button"
                className="otp-resend-link"
                onClick={handleResend}
                disabled={resending}
                id="btn-otp-resend"
              >
                {resending ? 'Sending…' : 'Resend Code'}
              </button>
            )}
          </div>
        </div>

        <div className="otp-actions-column">
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={verifying || digits.join('').length !== 6 || expirySeconds <= 0}
            id="btn-verify-otp"
          >
            {verifying ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Verifying Code…
              </>
            ) : (
              'Verify OTP'
            )}
          </button>

          <button
            type="button"
            className="otp-change-email-btn"
            onClick={onBack}
            disabled={verifying}
            id="btn-change-email"
          >
            Use Different Email
          </button>
        </div>
      </form>
    </div>
  );
}
