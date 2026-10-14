/**
 * Email Service — CampusFlow AI
 *
 * Sends transactional emails (OTP, welcome, etc.) via SMTP / Nodemailer.
 *
 * Environment variables:
 *   SMTP_HOST     — e.g. smtp.gmail.com
 *   SMTP_PORT     — e.g. 587
 *   SMTP_SECURE   — false for STARTTLS (587), true for SSL (465)
 *   SMTP_USER     — your email address / SMTP username
 *   SMTP_PASS     — app password (NOT main password)
 *   EMAIL_FROM    — display name + address, e.g. "CampusFlow AI <noreply@campusflow.ai>"
 */

'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

function isEmailConfigured() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  return Boolean(host && user && pass);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  try {
    transporter = nodemailer.createTransport({
      host:   (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
      port:   parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: (process.env.SMTP_USER || '').trim(),
        pass: (process.env.SMTP_PASS || '').trim(),
      },
    });
    return transporter;
  } catch (err) {
    console.error('[EmailService] Failed to create transport:', err.message);
    return null;
  }
}

/**
 * Send an OTP verification email.
 * @param {string} toEmail
 * @param {string} otp        plain-text 6-digit OTP
 * @param {string} userName
 * @returns {Promise<{ sent: boolean }>}
 */
async function sendOtpEmail(toEmail, otp, userName = 'Student') {
  if (!isEmailConfigured()) {
    const err = new Error('Email service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const tp = getTransporter();
  if (!tp) {
    const err = new Error('Email transport could not be initialized. Please check SMTP configuration in server/.env.');
    err.code = 'EMAIL_INIT_FAILED';
    err.status = 503;
    throw err;
  }

  const from = process.env.EMAIL_FROM || `CampusFlow AI <noreply@campusflow.ai>`;
  const subject = 'Your CampusFlow AI verification code';

  const textContent = `Hello,

Your CampusFlow AI verification code is:

${otp}

This code expires in 5 minutes.

If you did not attempt to sign in, you can ignore this email.

CampusFlow AI Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your CampusFlow AI verification code</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;-webkit-font-smoothing:antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:48px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#141414;border:1px solid #262626;border-radius:12px;padding:36px 32px;text-align:left;">
              <tr>
                <td style="padding-bottom:24px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:12px;">
                        <div style="background-color:#FF3D00;width:36px;height:36px;line-height:36px;text-align:center;font-weight:900;font-size:14px;color:#FFFFFF;display:inline-block;border-radius:8px;">CF</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:16px;font-weight:900;letter-spacing:0.04em;color:#FFFFFF;text-transform:uppercase;">CAMPUSFLOW <span style="color:#FF3D00;">AI</span></span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0;">Verify Your Email</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;color:#A3A3A3;font-size:14px;line-height:1.6;">
                  Hello ${userName || 'Student'},<br/><br/>
                  Your CampusFlow AI verification code is:
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;">
                  <div style="background-color:#0A0A0A;border:1px solid #262626;border-radius:8px;padding:24px;text-align:center;">
                    <span style="font-size:38px;font-weight:900;letter-spacing:0.25em;color:#FF3D00;font-family:Consolas,monaco,monospace;display:inline-block;padding-left:0.25em;">${otp}</span>
                    <div style="color:#737373;font-size:12px;margin-top:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">This code expires in 5 minutes</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:28px;color:#737373;font-size:13px;line-height:1.6;">
                  If you did not attempt to sign in, you can safely ignore this email. Never share this code with anyone.
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #262626;padding-top:20px;color:#525252;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">
                  CampusFlow AI Team · Academic Intelligence Platform
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await tp.sendMail({
      from,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    return { sent: true };
  } catch (sendErr) {
    console.error('[EmailService] SMTP delivery failed:', sendErr.message);
    let userMsg = `Failed to send verification email: ${sendErr.message}`;
    if (sendErr.message && (sendErr.message.includes('535') || sendErr.message.includes('BadCredentials'))) {
      userMsg = 'SMTP authentication failed. If using Gmail, you must generate and use a 16-character App Password (Google Account > Security > 2-Step Verification > App Passwords) rather than your standard Gmail password.';
    }
    const err = new Error(userMsg);
    err.code = 'EMAIL_SEND_FAILED';
    err.status = 502;
    throw err;
  }
}

/**
 * Send a welcome email after successful registration.
 */
async function sendWelcomeEmail(toEmail, userName) {
  if (!isEmailConfigured()) return;
  const tp = getTransporter();
  if (!tp) return;

  const from = process.env.EMAIL_FROM || `CampusFlow AI <noreply@campusflow.ai>`;
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CampusFlow AI</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;-webkit-font-smoothing:antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:48px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background-color:#141414;border:1px solid #262626;border-radius:12px;padding:40px 36px;text-align:left;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
              <tr>
                <td style="padding-bottom:24px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:12px;">
                        <div style="background-color:#FF3D00;width:36px;height:36px;line-height:36px;text-align:center;font-weight:900;font-size:14px;color:#FFFFFF;display:inline-block;border-radius:8px;">CF</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:16px;font-weight:900;letter-spacing:0.04em;color:#FFFFFF;text-transform:uppercase;">CAMPUSFLOW <span style="color:#FF3D00;">AI</span></span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0;">Welcome, ${userName}.</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;color:#A3A3A3;font-size:14px;line-height:1.7;">
                  Your CampusFlow AI workspace is ready. You can now track your live university attendance, prioritize pending coursework, manage exams, and analyze your academic performance in one unified platform.
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #262626;padding-top:20px;color:#525252;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">
                  CampusFlow AI · Academic Management &amp; Intelligence Platform
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await tp.sendMail({ from, to: toEmail, subject: 'Welcome to CampusFlow AI', html });
  } catch (err) {
    console.error('[EmailService] Failed to send welcome email:', err.message);
  }
}

/**
 * Send a password reset email.
 * @param {string} toEmail
 * @param {string} resetUrl
 * @param {string} userName
 * @returns {Promise<{ sent: boolean }>}
 */
async function sendPasswordResetEmail(toEmail, resetUrl, userName = 'Student') {
  if (!isEmailConfigured()) {
    const err = new Error('Email service is not configured. Please configure SMTP_USER and SMTP_PASS in server/.env.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const tp = getTransporter();
  if (!tp) {
    const err = new Error('Email transport could not be initialized. Please check SMTP configuration in server/.env.');
    err.code = 'EMAIL_INIT_FAILED';
    err.status = 503;
    throw err;
  }

  const from = process.env.EMAIL_FROM || `CampusFlow AI <noreply@campusflow.ai>`;
  const subject = 'Reset Your CampusFlow AI Password';

  const textContent = `Hello,

We received a request to reset the password for your CampusFlow AI account.

Click the secure link below to choose a new password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this password reset, you can safely ignore this email.

CampusFlow AI Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your CampusFlow AI Password</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#FFFFFF;-webkit-font-smoothing:antialiased;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:48px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background-color:#141414;border:1px solid #262626;border-radius:12px;padding:40px 36px;text-align:left;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
              <tr>
                <td style="padding-bottom:24px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:middle;padding-right:12px;">
                        <div style="background-color:#FF3D00;width:36px;height:36px;line-height:36px;text-align:center;font-weight:900;font-size:14px;color:#FFFFFF;display:inline-block;border-radius:8px;">CF</div>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:16px;font-weight:900;letter-spacing:0.04em;color:#FFFFFF;text-transform:uppercase;">CAMPUSFLOW <span style="color:#FF3D00;">AI</span></span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0;">Reset Your Password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:20px;color:#A3A3A3;font-size:14px;line-height:1.6;">
                  Hello ${userName || 'Student'},<br/><br/>
                  We received a request to reset the password for your CampusFlow AI account.<br/>
                  Click the secure link below to choose a new password:
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;text-align:center;">
                  <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="background-color:#FF3D00;color:#FFFFFF;font-weight:800;font-size:14px;letter-spacing:0.04em;text-decoration:none;padding:14px 32px;display:inline-block;border-radius:8px;text-transform:uppercase;box-shadow:0 4px 12px rgba(255,61,0,0.3);">Reset Password</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:20px;color:#737373;font-size:12px;line-height:1.6;word-break:break-all;">
                  Button not opening? Copy and paste this URL directly into your browser:<br/>
                  <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="color:#FF5722;text-decoration:underline;word-break:break-all;">${resetUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:20px;color:#737373;font-size:12px;line-height:1.6;">
                  This link expires in 15 minutes.<br/>
                  If you did not request this password reset, you can safely ignore this email.
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #262626;padding-top:20px;color:#525252;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">
                  CampusFlow AI Team · Academic Intelligence Platform
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await tp.sendMail({
      from,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    return { sent: true };
  } catch (sendErr) {
    console.error('[EmailService] SMTP delivery failed for password reset:', sendErr.message);
    let userMsg = `Failed to send password reset email: ${sendErr.message}`;
    if (sendErr.message && (sendErr.message.includes('535') || sendErr.message.includes('BadCredentials'))) {
      userMsg = 'SMTP authentication failed. If using Gmail, you must generate and use a 16-character App Password rather than your standard Gmail password.';
    }
    const err = new Error(userMsg);
    err.code = 'EMAIL_SEND_FAILED';
    err.status = 502;
    throw err;
  }
}

/**
 * Send a Contact Us inquiry to support and confirmation to the sender.
 * @param {Object} data { name, email, subject, message }
 * @returns {Promise<{ sent: boolean }>}
 */
async function sendContactUsEmail({ name, email, subject, message }) {
  if (!isEmailConfigured()) {
    const err = new Error('Email delivery is not configured on this server. Please configure SMTP in server/.env.');
    err.code = 'EMAIL_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  const tp = getTransporter();
  if (!tp) {
    const err = new Error('Failed to initialize email transport.');
    err.code = 'EMAIL_TRANSPORT_FAILED';
    err.status = 503;
    throw err;
  }

  const from = process.env.EMAIL_FROM || `CampusFlow AI Support <${process.env.SMTP_USER}>`;
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:24px;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#FFFFFF;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:12px;padding:32px;">
        <tr>
          <td style="padding-bottom:20px;border-bottom:1px solid #262626;">
            <div style="font-size:18px;font-weight:900;color:#FFFFFF;letter-spacing:0.02em;">
              CAMPUSFLOW <span style="color:#FF3D00;">AI</span>
            </div>
            <div style="font-size:12px;color:#A3A3A3;margin-top:4px;">New Contact Inquiry Received</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 0;">
            <p style="margin:0 0 12px;font-size:14px;color:#A3A3A3;"><strong>Sender:</strong> ${name} &lt;${email}&gt;</p>
            <p style="margin:0 0 16px;font-size:14px;color:#A3A3A3;"><strong>Subject:</strong> ${subject}</p>
            <div style="background:#0A0A0A;border:1px solid #262626;border-radius:8px;padding:18px;font-size:14px;line-height:1.6;color:#FFFFFF;white-space:pre-wrap;">${message}</div>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #262626;padding-top:18px;font-size:12px;color:#525252;">
            Sent securely via CampusFlow AI Contact Service.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await tp.sendMail({
      from,
      to: supportEmail,
      replyTo: email,
      subject: `[CampusFlow Contact] ${subject} - from ${name}`,
      text: `CampusFlow AI Contact Message\n\nFrom: ${name} <${email}>\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: htmlContent,
    });
    return { sent: true };
  } catch (err) {
    console.error('[EmailService] Failed to send contact message:', err.message);
    const sendErr = new Error(`Failed to deliver message: ${err.message}`);
    sendErr.code = 'EMAIL_SEND_FAILED';
    sendErr.status = 502;
    throw sendErr;
  }
}

module.exports = {
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendContactUsEmail,
  isEmailConfigured,
};
