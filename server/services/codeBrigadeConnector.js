/**
 * Code Brigade Connector — CampusFlow AI
 *
 * Dedicated, secure server-side client for Chitkara University's
 * Code Brigade / Chalkpad Pro mobile endpoints.
 *
 * Security & Reliability:
 *  - Upstream host is strictly allowlisted to cuiet.codebrigade.in / gdemo.schoolpad.in.
 *  - 10-second timeout on all network calls.
 *  - Credentials and session tokens are strictly server-side.
 *  - Gracefully distinguishes between authentication failure, network outage, and session expiration.
 */

'use strict';

const crypto = require('crypto');
const { parseAttendanceSubjectwise, parseAttendanceRegister } = require('./codeBrigadeParser');

const ALLOWED_HOSTS = ['cuiet.codebrigade.in', 'gdemo.schoolpad.in', 'codebrigade.in'];
const DEFAULT_BASE_URL = 'https://cuiet.codebrigade.in';
const DEFAULT_SCHOOL_CODE = '800002'; // CUIET Chitkara University
const USER_AGENT = 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G960F)';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Generate standard RFC4122 v4 UUID for device identification.
 */
function generateDeviceUUID() {
  return crypto.randomUUID();
}

/**
 * Perform a secure, timed fetch request to allowlisted university endpoints.
 */
async function timedFetch(url, options = {}) {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTS.some(host => parsed.hostname.endsWith(host))) {
    throw new Error(`Access denied: Upstream host ${parsed.hostname} is not in the allowlist.`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Encoding': 'gzip',
        ...(options.headers || {}),
      },
    });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`University upstream request timed out after ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class CodeBrigadeConnector {
  constructor() {
    this.baseUrl = DEFAULT_BASE_URL;
    this.schoolCode = DEFAULT_SCHOOL_CODE;
  }

  /**
   * Authenticate student credentials with Code Brigade / Chalkpad Pro.
   *
   * @param {string} username
   * @param {string} password
   * @param {string} [schoolCode]
   * @returns {Promise<Object>}
   */
  async login(username, password, schoolCode = DEFAULT_SCHOOL_CODE) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const deviceUUID = generateDeviceUUID();
    const loginUrl = `${this.baseUrl}/mobilev2/appLoginAuthV2`;

    const bodyParams = new URLSearchParams({
      deviceIdUUID: deviceUUID,
      device: 'android',
      txtUsername: username.trim(),
      txtPassword: password,
    });

    const response = await timedFetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    if (!response.ok) {
      throw new Error(`University server returned HTTP ${response.status}`);
    }

    const rawText = await response.text();
    let json;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error('Malformed JSON received from university login portal.');
    }

    const status = String(json.status);
    const verificationStatus = String(json.verificationStatus ?? '');
    const dataPayload = json.data;
    const userData = Array.isArray(dataPayload) && dataPayload.length > 0 ? dataPayload[0] : dataPayload;

    // Status 1: Login Successful
    if (status === '1') {
      // Obtain security token
      let securityToken = '';
      try {
        const tokenRes = await timedFetch(`${this.baseUrl}/mobilev2/savetoken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            user_id: userData.userId,
            roleId: userData.roleId,
            clientId: schoolCode,
            deviceIdUUID: deviceUUID,
          }).toString(),
        });
        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          securityToken = tokenJson.token || '';
        }
      } catch (tokenErr) {
        console.warn('Notice: Could not retrieve secondary security token:', tokenErr.message);
      }

      return {
        success: true,
        requiresOTP: false,
        deviceUUID,
        securityToken,
        userData: {
          apiKey: userData.apiKey,
          userId: String(userData.userId),
          sessionId: String(userData.sessionId),
          roleId: String(userData.roleId),
          studentId: String(userData.studentId || userData.userId),
          name: userData.name || userData.studentName || username,
          rollNumber: userData.rollNo || userData.rollNumber || '',
        },
      };
    }

    // Status 4: OTP Verification Required
    if (status === '4') {
      return {
        success: false,
        requiresOTP: true,
        authUserId: String(userData?.userId || ''),
        deviceUUID,
        otpHint: json.mobileString || 'Registered university mobile/email',
        message: 'OTP verification required by university portal.',
      };
    }

    // Status 8: Password Expired
    if (verificationStatus === '8') {
      return {
        success: false,
        requiresOTP: false,
        error: json.validation || 'Your university portal password has expired. Please reset it on Chalkpad.',
      };
    }

    // Status 0: Invalid Credentials
    if (status === '0') {
      return {
        success: false,
        requiresOTP: false,
        error: 'Invalid university username or password. Please verify your Chalkpad credentials.',
      };
    }

    return {
      success: false,
      requiresOTP: false,
      error: json.message || 'University authentication failed. Please check with your institute admin.',
    };
  }

  /**
   * Verify OTP if challenged during university authentication.
   *
   * @param {string} authUserId
   * @param {string} otpText
   * @param {string} [deviceUUID]
   * @returns {Promise<Object>}
   */
  async verifyOtp(authUserId, otpText, deviceUUID = generateDeviceUUID()) {
    const url = `${this.baseUrl}/mobilev2/verifyOtp`;
    const response = await timedFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        authUserId,
        OTPText: otpText.trim(),
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`University server returned HTTP ${response.status} during OTP verification.`);
    }

    const json = await response.json();
    if (String(json.status) === '1') {
      const dataPayload = json.data;
      const userData = Array.isArray(dataPayload) && dataPayload.length > 0 ? dataPayload[0] : dataPayload;
      return {
        success: true,
        userData: {
          apiKey: userData.apiKey,
          userId: String(userData.userId),
          sessionId: String(userData.sessionId),
          roleId: String(userData.roleId),
          studentId: String(userData.studentId || userData.userId),
          name: userData.name || '',
          rollNumber: userData.rollNo || '',
        },
        deviceUUID,
      };
    }

    return {
      success: false,
      error: json.message || 'Invalid or expired OTP code entered.',
    };
  }

  /**
   * Fetch and parse live attendance records from Code Brigade.
   *
   * @param {Object} session - Stored CodeBrigadeSession document
   * @returns {Promise<Object>} { subjects: Array, rawRegister: Array }
   */
  async fetchAttendance(session) {
    if (!session || !session.apiKey || !session.userId) {
      const err = new Error('No active Code Brigade university session found.');
      err.code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    const {
      baseUrl = DEFAULT_BASE_URL,
      apiKey,
      userId,
      sessionId,
      roleId,
      studentId = userId,
      securityToken = '',
      deviceUUID = generateDeviceUUID(),
    } = session;

    const authSuffix = `&securityToken=${encodeURIComponent(securityToken)}&deviceIdUUID=${encodeURIComponent(deviceUUID)}`;

    // 1. Fetch Subject-wise summary via mobilev2/commonPage (commonPageId: 28)
    const summaryUrl = `${baseUrl}/mobilev2/commonPage`;
    const summaryBody = `commonObj=&commonPageId=28&device=android&userId=${userId}&sessionId=${sessionId}&roleId=${roleId}&apiKey=${apiKey}${authSuffix}`;

    // 2. Fetch Detailed Register via chalkpadpro/studentDetails/getAttendanceRegister
    const registerUrl = `${baseUrl}/chalkpadpro/studentDetails/getAttendanceRegister`;
    const warmupUrl = `${baseUrl}/mobilev2/showAttendance`;
    const warmupBody = `prevNext=0&userId=${userId}&sessionId=${sessionId}&apiKey=${apiKey}&roleId=${roleId}&month=${authSuffix}`;
    const registerBody = `studentId=${studentId}&sessionId=${sessionId}&userId=${userId}&apiKey=${apiKey}&roleId=${roleId}${authSuffix}`;

    const [summaryRes, registerRes] = await Promise.allSettled([
      timedFetch(summaryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: summaryBody,
      }),
      timedFetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Warmup-Url': encodeURIComponent(warmupUrl),
          'X-Warmup-Body': encodeURIComponent(warmupBody),
        },
        body: registerBody,
      }),
    ]);

    let parsedSubjects = [];
    let parsedRegister = [];

    // Process summary response
    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      try {
        const summaryJson = await summaryRes.value.json();
        const htmlContent = summaryJson.content || '';
        if (htmlContent) {
          parsedSubjects = parseAttendanceSubjectwise(htmlContent);
        }
      } catch (err) {
        console.warn('Warning: Could not parse subjectwise JSON response:', err.message);
      }
    }

    // Process register response
    if (registerRes.status === 'fulfilled' && registerRes.value.ok) {
      try {
        const registerHtml = await registerRes.value.text();
        if (registerHtml && registerHtml.length > 50) {
          parsedRegister = parseAttendanceRegister(registerHtml);
        }
      } catch (err) {
        console.warn('Warning: Could not parse register HTML response:', err.message);
      }
    }

    // If both failed or returned empty content, verify whether session expired
    if (parsedSubjects.length === 0 && parsedRegister.length === 0) {
      // If server responded with 401/403 or empty responses, session likely expired
      if (
        (summaryRes.status === 'fulfilled' && summaryRes.value.status === 401) ||
        (registerRes.status === 'fulfilled' && registerRes.value.status === 401)
      ) {
        const err = new Error('University authentication session expired. Please re-authenticate.');
        err.code = 'SESSION_EXPIRED';
        throw err;
      }
    }

    return {
      subjects: parsedSubjects,
      registers: parsedRegister,
    };
  }
}

module.exports = new CodeBrigadeConnector();
