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
    <body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080808;padding:40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#111111;border:1px solid #222222;border-radius:4px;padding:36px 32px;text-align:left;">
              <tr>
                <td style="padding-bottom:24px;">
                  <div style="background-color:#E8FF00;width:38px;height:38px;line-height:38px;text-align:center;font-weight:900;font-size:15px;color:#080808;display:inline-block;border-radius:2px;">CF</div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.02em;margin:0;text-transform:uppercase;">Verify Your Email</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;color:#a0a0a0;font-size:14px;line-height:1.6;">
                  Hello ${userName || 'Student'},<br/><br/>
                  Your CampusFlow AI verification code is:
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:24px;">
                  <div style="background-color:#181818;border:1px solid #333333;border-radius:4px;padding:24px;text-align:center;">
                    <span style="font-size:40px;font-weight:900;letter-spacing:0.25em;color:#E8FF00;font-family:Consolas,monaco,monospace;display:inline-block;">${otp}</span>
                    <div style="color:#888888;font-size:12px;margin-top:12px;text-transform:uppercase;letter-spacing:0.08em;">This code expires in 5 minutes.</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:28px;color:#777777;font-size:13px;line-height:1.6;">
                  If you did not attempt to sign in, you can ignore this email. Do not share this code with anyone.
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #222222;padding-top:20px;color:#555555;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">
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
    <html>
    <body style="background:#080808;font-family:system-ui,sans-serif;padding:40px 0;color:#fff;">
      <div style="max-width:480px;margin:auto;background:#111;border:1px solid #222;padding:40px;">
        <div style="background:#E8FF00;width:40px;height:40px;font-weight:900;font-size:16px;color:#080808;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">CF</div>
        <h1 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 12px;">Welcome, ${userName}.</h1>
        <p style="color:#999;font-size:14px;line-height:1.7;margin:0 0 24px;">Your CampusFlow AI account is ready. Start by adding your subjects, tasks, and exam schedule.</p>
        <p style="color:#666;font-size:12px;margin:0;">Your academic life, intelligently organized.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await tp.sendMail({ from, to: toEmail, subject: 'Welcome to CampusFlow AI', html });
  } catch (err) {
    console.error('[EmailService] Failed to send welcome email:', err.message);
  }
}

module.exports = { sendOtpEmail, sendWelcomeEmail, isEmailConfigured };
