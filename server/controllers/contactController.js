'use strict';

const emailService = require('../services/emailService');

// In-memory rate limiting map: ip -> [timestamp, timestamp, ...]
const ipRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

// Periodically purge expired IP rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      ipRateLimitMap.delete(ip);
    } else {
      ipRateLimitMap.set(ip, valid);
    }
  }
}, 5 * 60 * 1000);

/**
 * Handle Contact Us submission
 * POST /api/contact
 */
async function submitContactMessage(req, res, next) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Check rate limit
    const timestamps = (ipRateLimitMap.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        success: false,
        message: 'Too many contact inquiries from this IP. Please wait a few minutes before submitting again.',
      });
    }

    const { name, email, subject, message } = req.body || {};

    const errors = {};
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim() : '';
    const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedName || trimmedName.length < 2) {
      errors.name = 'Please provide your name (at least 2 characters).';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name must be 100 characters or fewer.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address.';
    }

    if (!trimmedSubject || trimmedSubject.length < 2) {
      errors.subject = 'Please specify a subject (at least 2 characters).';
    } else if (trimmedSubject.length > 150) {
      errors.subject = 'Subject must be 150 characters or fewer.';
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      errors.message = 'Please enter a message of at least 10 characters.';
    } else if (trimmedMessage.length > 2000) {
      errors.message = 'Message must be 2000 characters or fewer.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please resolve form validation errors.',
        errors,
      });
    }

    // Verify SMTP is configured before attempting delivery
    if (!emailService.isEmailConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Contact email delivery is not configured on this server. Please configure SMTP in server/.env.',
        code: 'EMAIL_NOT_CONFIGURED',
      });
    }

    // Record rate limit hit
    timestamps.push(now);
    ipRateLimitMap.set(ip, timestamps);

    await emailService.sendContactUsEmail({
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
    });

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully! Our academic support team will get back to you shortly.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitContactMessage,
};
