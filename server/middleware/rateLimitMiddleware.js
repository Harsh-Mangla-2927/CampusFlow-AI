/**
 * Rate Limiting Middleware — CampusFlow AI
 * In-memory sliding window rate limiter for brute-force defense on sensitive endpoints.
 */

'use strict';

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 50, message = 'Too many requests, please try again later.' } = {}) {
  const store = new Map();

  // Periodic cleanup of stale records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of store.entries()) {
      if (now - data.startTime > windowMs) {
        store.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req, res, next) => {
    // Determine client IP safely
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    const record = store.get(ip);

    if (!record || now - record.startTime > windowMs) {
      store.set(ip, { startTime: now, count: 1 });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSec = Math.ceil((record.startTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

// Preset limiters for key operations
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 60,
  message: 'Too many authentication attempts from this network. Please wait a few minutes before trying again.',
});

const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 30,
  message: 'Too many verification code requests. Please wait a few minutes before requesting another OTP.',
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30,
  message: 'Too many password reset requests from this address. Please try again later.',
});

module.exports = {
  createRateLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
};
