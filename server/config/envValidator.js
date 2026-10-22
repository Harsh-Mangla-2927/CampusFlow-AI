/**
 * Environment Variables Validator — CampusFlow AI
 * Validates essential runtime configuration before application boot.
 * Protects against startup with missing secrets or invalid configurations.
 */

'use strict';

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Mandatory in all environments
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is required to sign and verify authentication tokens.');
  } else if (process.env.JWT_SECRET.length < 16) {
    warnings.push('JWT_SECRET is shorter than 16 characters. Use a strong secret in production.');
  }

  // 2. Database URI
  if (!process.env.MONGODB_URI && !process.env.MONGODB_LOCAL_URI) {
    errors.push('Neither MONGODB_URI nor MONGODB_LOCAL_URI is defined.');
  }

  // 3. Production specific checks
  if (isProduction) {
    if (!process.env.CLIENT_URL) {
      warnings.push('CLIENT_URL is not set in production; CORS will allow requests cautiously.');
    }
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      warnings.push('SMTP credentials are not configured. Live OTP emails will not dispatch.');
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ CRITICAL CONFIGURATION ERROR(S):');
    errors.forEach(err => console.error(`   • ${err}`));
    console.error('Please configure the required environment variables before starting.\n');
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️ Configuration Notice:');
    warnings.forEach(w => console.warn(`   • ${w}`));
    console.warn('');
  }

  return { valid: true };
}

module.exports = { validateEnv };
