/**
 * Validation Service — CampusFlow AI
 *
 * Centralised validation logic shared across all controllers.
 * Ensures consistent rules between frontend expectations and backend enforcement.
 */

/**
 * Check if an email belongs to an allowed educational domain.
 * Configured via ALLOWED_EMAIL_DOMAINS env variable.
 * If not configured, any email is accepted (dev mode).
 *
 * @param {string} email
 * @returns {{ valid: boolean, message?: string }}
 */
function validateEducationalEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'A valid email address is required.' };
  }

  const normalized = email.trim().toLowerCase();

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }

  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS;

  // If no domain restriction configured, accept any valid email
  if (!allowedDomains || allowedDomains.trim() === '') {
    return { valid: true };
  }

  const domains = allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const emailDomain = normalized.split('@')[1];

  const isAllowed = domains.some(domain =>
    emailDomain === domain || emailDomain.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return {
      valid: false,
      message: `Please use your university educational email address (${domains.join(' or ')}).`,
    };
  }

  return { valid: true };
}

/**
 * Validate password strength.
 * @param {string} password
 * @returns {{ valid: boolean, score: number, message?: string, requirements: object }}
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, score: 0, message: 'Password is required.' };
  }

  const requirements = {
    minLength:   password.length >= 8,
    uppercase:   /[A-Z]/.test(password),
    lowercase:   /[a-z]/.test(password),
    number:      /[0-9]/.test(password),
    special:     /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(requirements).filter(Boolean).length;

  if (!requirements.minLength) {
    return { valid: false, score, requirements, message: 'Password must be at least 8 characters.' };
  }
  if (score < 3) {
    return { valid: false, score, requirements, message: 'Password is too weak. Add uppercase, numbers, or symbols.' };
  }

  return { valid: true, score, requirements };
}

/**
 * Get password strength label from score (1-5).
 */
function getPasswordStrengthLabel(score) {
  if (score <= 1) return 'VERY WEAK';
  if (score === 2) return 'WEAK';
  if (score === 3) return 'FAIR';
  if (score === 4) return 'STRONG';
  return 'VERY STRONG';
}

/**
 * Sanitise a string field.
 */
function sanitizeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Validate a date string — must be parseable and not in the past (optional).
 */
function validateDate(dateStr, { allowPast = true } = {}) {
  if (!dateStr) return { valid: false, message: 'Date is required.' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { valid: false, message: 'Invalid date.' };
  if (!allowPast && d < new Date()) return { valid: false, message: 'Date cannot be in the past.' };
  return { valid: true };
}

module.exports = {
  validateEducationalEmail,
  validatePasswordStrength,
  getPasswordStrengthLabel,
  sanitizeString,
  validateDate,
};
