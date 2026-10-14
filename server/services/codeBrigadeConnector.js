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
const {
  parseAttendanceSubjectwise,
  parseAttendanceRegister,
  parseGradeCard,
  parseCircularsList,
  parseFeedDetailHtml,
} = require('./codeBrigadeParser');

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

/**
 * Attempt web portal login to capture CodeIgniter session cookies for web-only endpoints.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} [baseUrl]
 * @returns {Promise<string>} Semicolon-delimited Cookie header value
 */
async function attemptWebLogin(username, password, baseUrl = DEFAULT_BASE_URL) {
  try {
    const loadRes = await timedFetch(`${baseUrl}/loginManager/load`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!loadRes.ok) return '';
    const setCookies = typeof loadRes.headers.getSetCookie === 'function'
      ? loadRes.headers.getSetCookie()
      : [loadRes.headers.get('set-cookie') || ''];
    const loadCookies = setCookies.join('; ');
    const html = await loadRes.text();

    const csrfMatch = html.match(/name=["']csrf_token_login["'][^>]*value=["']([^"']+)["']/i);
    const formIdMatch = html.match(/name=["']formId["'][^>]*value=["']([^"']+)["']/i);

    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    const formId = formIdMatch ? formIdMatch[1] : '';

    if (!csrfToken) return '';

    const cookiePairs = [];
    const ciMatch = loadCookies.match(/ci_session=[^;]+/i);
    const phpMatch = loadCookies.match(/PHPSESSID=[^;]+/i);
    if (ciMatch) cookiePairs.push(ciMatch[0]);
    if (phpMatch) cookiePairs.push(phpMatch[0]);

    const loginParams = new URLSearchParams({
      formId,
      csrf_token_login: csrfToken,
      txtUsername: username.trim(),
      txtPassword: password,
      txtInstitute: '1',
    });

    const checkRes = await timedFetch(`${baseUrl}/loginManager/checkLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(cookiePairs.length > 0 && { Cookie: cookiePairs.join('; ') }),
      },
      body: loginParams.toString(),
      redirect: 'manual',
    });

    const checkSetCookies = typeof checkRes.headers.getSetCookie === 'function'
      ? checkRes.headers.getSetCookie()
      : [checkRes.headers.get('set-cookie') || ''];
    const checkCookies = checkSetCookies.join('; ');
    const finalCookies = [];
    const ciFinal = checkCookies.match(/ci_session=[^;]+/i) || ciMatch;
    const phpFinal = checkCookies.match(/PHPSESSID=[^;]+/i) || phpMatch;
    if (ciFinal) finalCookies.push(ciFinal[0]);
    if (phpFinal) finalCookies.push(phpFinal[0]);

    return finalCookies.join('; ');
  } catch (err) {
    console.warn('[CodeBrigade Connector] Web login notice:', err.message);
    return '';
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

      // Query student details for classId and full student profile
      let classId = '';
      let className = '';
      try {
        const userRes = await timedFetch(`${this.baseUrl}/mobilev2/getUserDetails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            userId: String(userData.userId),
            sessionId: String(userData.sessionId),
            roleId: String(userData.roleId),
            apiKey: String(userData.apiKey),
            deviceIdUUID: deviceUUID,
            securityToken,
            token: securityToken,
          }).toString(),
        });
        if (userRes.ok) {
          const userJson = await userRes.json();
          const uInfo = Array.isArray(userJson) && userJson.length > 0 ? userJson[0] : userJson;
          if (uInfo) {
            classId = String(uInfo.classId || '');
            className = String(uInfo.stuClassName || uInfo.className || '');
            if (uInfo.firstName && !userData.name) userData.name = uInfo.firstName;
            if (uInfo.rollNo && !userData.rollNumber) userData.rollNumber = uInfo.rollNo;
          }
        }
      } catch (userErr) {
        console.warn('Notice: Could not retrieve extended student details:', userErr.message);
      }

      // Attempt to capture web session cookies for timeline endpoints
      let cookies = '';
      try {
        cookies = await attemptWebLogin(username, password, this.baseUrl);
      } catch (cErr) {
        console.warn('Notice: Web session cookie not obtained:', cErr.message);
      }

      return {
        success: true,
        requiresOTP: false,
        deviceUUID,
        securityToken,
        classId,
        className,
        cookies,
        userData: {
          apiKey: userData.apiKey,
          userId: String(userData.userId),
          sessionId: String(userData.sessionId),
          roleId: String(userData.roleId),
          studentId: String(userData.studentId || userData.userId),
          name: userData.name || userData.studentName || username,
          rollNumber: userData.rollNo || userData.rollNumber || '',
          classId,
          className,
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
   * @param {string} [schoolCode]
   * @returns {Promise<Object>}
   */
  async verifyOtp(authUserId, otpText, deviceUUID = generateDeviceUUID(), schoolCode = DEFAULT_SCHOOL_CODE) {
    const url = `${this.baseUrl}/mobilev2/verifyOtp`;
    console.log(`[CodeBrigade Connector] Submitting OTP verification for authUserId: ${authUserId}`);

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
    console.log(`[CodeBrigade Connector] OTP verification response status: ${json.status}`);

    if (String(json.status) === '1') {
      const dataPayload = json.data;
      const userData = Array.isArray(dataPayload) && dataPayload.length > 0 ? dataPayload[0] : dataPayload;

      // Crucial Step: Save token to establish authenticated university session
      let securityToken = '';
      try {
        console.log(`[CodeBrigade Connector] Calling savetoken for userId: ${userData.userId}`);
        const tokenRes = await timedFetch(`${this.baseUrl}/mobilev2/savetoken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            user_id: String(userData.userId),
            roleId: String(userData.roleId),
            clientId: schoolCode,
            deviceIdUUID: deviceUUID,
          }).toString(),
        });
        if (tokenRes.ok) {
          const tokenJson = await tokenRes.json();
          securityToken = tokenJson.token || '';
          console.log(`[CodeBrigade Connector] Security token acquired: ${!!securityToken}`);
        }
      } catch (tokenErr) {
        console.warn('[CodeBrigade Connector] Warning: Could not retrieve secondary security token after OTP:', tokenErr.message);
      }

      // Query student profile details for classId and className
      let classId = '';
      let className = '';
      try {
        const userRes = await timedFetch(`${this.baseUrl}/mobilev2/getUserDetails`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            userId: String(userData.userId),
            sessionId: String(userData.sessionId),
            roleId: String(userData.roleId),
            apiKey: String(userData.apiKey),
            deviceIdUUID: deviceUUID,
            securityToken,
            token: securityToken,
          }).toString(),
        });
        if (userRes.ok) {
          const userJson = await userRes.json();
          const uInfo = Array.isArray(userJson) && userJson.length > 0 ? userJson[0] : userJson;
          if (uInfo) {
            classId = String(uInfo.classId || '');
            className = String(uInfo.stuClassName || uInfo.className || '');
            if (uInfo.firstName && !userData.name) userData.name = uInfo.firstName;
            if (uInfo.rollNo && !userData.rollNumber) userData.rollNumber = uInfo.rollNo;
            console.log(`[CodeBrigade Connector] Profile retrieved for ${userData.name} (Class: ${className || classId})`);
          }
        }
      } catch (userErr) {
        console.warn('[CodeBrigade Connector] Warning: Could not retrieve student details after OTP:', userErr.message);
      }

      return {
        success: true,
        securityToken,
        classId,
        className,
        userData: {
          apiKey: userData.apiKey,
          userId: String(userData.userId),
          sessionId: String(userData.sessionId),
          roleId: String(userData.roleId),
          studentId: String(userData.studentId || userData.userId),
          name: userData.name || '',
          rollNumber: userData.rollNo || userData.rollNumber || '',
          classId,
          className,
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
   * @returns {Promise<Object>} { subjects: Array, registers: Array }
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
      classId = '',
    } = session;

    console.log(`[CodeBrigade Connector] Fetching live attendance for Student ID: ${studentId}, Session: ${sessionId}`);

    // Build common parameters supported by Code Brigade mobile endpoints
    const baseParams = {
      userId: String(userId),
      sessionId: String(sessionId),
      roleId: String(roleId),
      apiKey: String(apiKey),
      deviceIdUUID: String(deviceUUID),
      securityToken: String(securityToken),
      token: String(securityToken),
      studentId: String(studentId),
    };
    if (classId) baseParams.classId = String(classId);

    // Helper to test an endpoint safely
    const fetchEndpoint = async (path, extraParams = {}) => {
      const fullUrl = `${baseUrl}/${path.replace(/^\//, '')}`;
      const body = new URLSearchParams({ ...baseParams, ...extraParams }).toString();
      try {
        const res = await timedFetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } catch (err) {
        return { ok: false, status: 0, error: err.message };
      }
    };

    // 1. Check for active session using mobilev2/getUserDetails or mobilev2/showAttendance
    const probeRes = await fetchEndpoint('mobilev2/getUserDetails');
    if (probeRes.text) {
      try {
        const probeJson = JSON.parse(probeRes.text);
        if (
          probeJson?.code === '403' ||
          probeJson?.status === 'error' ||
          (probeJson?.message && probeJson.message.toLowerCase().includes('session has expired'))
        ) {
          console.warn('[CodeBrigade Connector] Upstream reported session expired');
          const err = new Error('University authentication session expired. Please re-authenticate.');
          err.code = 'SESSION_EXPIRED';
          throw err;
        }
      } catch (parseErr) {
        if (parseErr.code === 'SESSION_EXPIRED') throw parseErr;
      }
    }

    // 2. Query Subject Summary (commonPageId 28, commonPageId 1, or mobilev2/getAttendanceRegister)
    const [summaryRes, registerRes, mobileRegRes] = await Promise.allSettled([
      fetchEndpoint('mobilev2/commonPage', { commonPageId: '28', device: 'android', commonObj: '' }),
      fetchEndpoint('chalkpadpro/studentDetails/getAttendanceRegister'),
      fetchEndpoint('mobilev2/getAttendanceRegister'),
    ]);

    let parsedSubjects = [];
    let parsedRegister = [];

    // Process summary responses
    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const text = summaryRes.value.text;
      try {
        const json = JSON.parse(text);
        if (
          json?.code === '403' ||
          json?.status === 'error' ||
          (json?.message && json.message.toLowerCase().includes('session has expired'))
        ) {
          const err = new Error('University authentication session expired. Please re-authenticate.');
          err.code = 'SESSION_EXPIRED';
          throw err;
        }
        if (json.content) {
          parsedSubjects = parseAttendanceSubjectwise(json.content);
        }
      } catch (err) {
        if (err.code === 'SESSION_EXPIRED') throw err;
      }
    }

    // Process detailed register responses
    const candidateRegisters = [registerRes, mobileRegRes];
    for (const regPromise of candidateRegisters) {
      if (regPromise.status === 'fulfilled' && regPromise.value.ok) {
        const text = regPromise.value.text;
        if (text && text.length > 50 && !text.includes('"status":"error"')) {
          const extracted = parseAttendanceRegister(text);
          if (extracted.length > 0) {
            parsedRegister = extracted;
            break;
          }
        }
      }
    }

    console.log(
      `[CodeBrigade Connector] Attendance synchronization parsed: ${parsedSubjects.length} subjects, ${parsedRegister.length} session registers.`
    );

    // If no subjects were parsed, verify whether the session actually expired on the mobile portal
    if (parsedSubjects.length === 0 && parsedRegister.length === 0) {
      if (summaryRes.status === 'fulfilled' && (summaryRes.value.status === 401 || summaryRes.value.status === 403)) {
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

  /**
   * Fetch and parse live report card / grade card records from Code Brigade.
   * Uses authorized student session with commonPageId 31 (Grade Card) and 19 (Report Card).
   *
   * @param {Object} session - Stored CodeBrigadeSession document
   * @returns {Promise<Object>} Extracted official grade card and semester breakdown
   */
  async fetchReportCard(session) {
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
      classId = '',
    } = session;

    console.log(
      `[CodeBrigade Connector] Fetching live grade card for Student ID: ${studentId}, Session: ${sessionId}`
    );

    const baseParams = {
      userId: String(userId),
      sessionId: String(sessionId),
      roleId: String(roleId),
      apiKey: String(apiKey),
      deviceIdUUID: String(deviceUUID),
      securityToken: String(securityToken),
      token: String(securityToken),
      studentId: String(studentId),
    };
    if (classId) baseParams.classId = String(classId);

    const fetchCommonPage = async (pageId) => {
      const fullUrl = `${baseUrl}/mobilev2/commonPage`;
      const body = new URLSearchParams({
        ...baseParams,
        commonPageId: String(pageId),
        device: 'android',
        commonObj: '',
      }).toString();

      try {
        const res = await timedFetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'gzip',
          },
          body,
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } catch (err) {
        return { ok: false, status: 0, error: err.message };
      }
    };

    // Query Grade Card (commonPageId 31) and Report Card (commonPageId 19)
    const [gradeCardRes, reportCardRes] = await Promise.allSettled([
      fetchCommonPage('31'),
      fetchCommonPage('19'),
    ]);

    let parsedResult = null;

    if (gradeCardRes.status === 'fulfilled' && gradeCardRes.value.ok) {
      const text = gradeCardRes.value.text;
      try {
        const json = JSON.parse(text);
        if (
          json?.code === '403' ||
          json?.status === 'error' ||
          (json?.message && json.message.toLowerCase().includes('session has expired'))
        ) {
          const err = new Error('University authentication session expired. Please re-authenticate.');
          err.code = 'SESSION_EXPIRED';
          throw err;
        }

        if (json.content) {
          const parsed = parseGradeCard(json.content);
          if (parsed && !parsed.empty && parsed.semesters && parsed.semesters.length > 0) {
            parsedResult = {
              ...parsed,
              title: json.title || 'Grade Card',
              source: 'CODE_BRIGADE',
            };
          }
        }
      } catch (err) {
        if (err.code === 'SESSION_EXPIRED') throw err;
      }
    }

    // Fallback to report card if grade card had no semesters
    if (!parsedResult && reportCardRes.status === 'fulfilled' && reportCardRes.value.ok) {
      const text = reportCardRes.value.text;
      try {
        const json = JSON.parse(text);
        if (json.content) {
          const parsed = parseGradeCard(json.content);
          if (parsed && !parsed.empty) {
            parsedResult = {
              ...parsed,
              title: json.title || 'Report Card',
              source: 'CODE_BRIGADE',
            };
          }
        }
      } catch (err) {
        // Ignore JSON parse errors on fallback
      }
    }

    if (!parsedResult) {
      return {
        empty: true,
        message: 'No official university examination report card published yet for this session.',
        source: 'CODE_BRIGADE',
        semesters: [],
      };
    }

    return parsedResult;
  }

  /**
   * Fetch live authenticated circulars and notices list from Code Brigade.
   * Uses authorized student session with /mobilev2/getCircularsList.
   *
   * @param {Object} session Active CodeBrigadeSession document
   * @returns {Promise<Array<Object>>} Parsed circular notices
   */
  async fetchCirculars(session) {
    if (!session || !session.apiKey || !session.sessionId) {
      const err = new Error('No active Code Brigade session found. Authentication required.');
      err.code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    const {
      baseUrl = DEFAULT_BASE_URL,
      apiKey,
      userId,
      sessionId,
      roleId = '4',
      studentId = userId,
      securityToken = '',
      deviceUUID = generateDeviceUUID(),
    } = session;

    console.log(
      `[CodeBrigade Connector] Fetching live circulars for Student ID: ${studentId}, Session: ${sessionId}`
    );

    const bodyParams = new URLSearchParams({
      userId: String(userId),
      sessionId: String(sessionId),
      roleId: String(roleId),
      apiKey: String(apiKey),
      deviceIdUUID: String(deviceUUID),
      securityToken: String(securityToken),
      token: String(securityToken),
      studentId: String(studentId),
      device: 'android',
    });

    const fullUrl = `${baseUrl}/mobilev2/getCircularsList`;
    const res = await timedFetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      throw new Error(`University server returned HTTP ${res.status} when fetching circulars.`);
    }

    const raw = await res.text();
    let htmlFragment = '';
    try {
      const parsedJson = JSON.parse(raw.trim());
      if (
        parsedJson?.code === '403' ||
        parsedJson?.status === 'error' ||
        (typeof parsedJson?.message === 'string' && parsedJson.message.toLowerCase().includes('session has expired'))
      ) {
        const err = new Error('University authentication session expired. Please re-authenticate.');
        err.code = 'SESSION_EXPIRED';
        throw err;
      }
      htmlFragment = typeof parsedJson === 'string' ? parsedJson : (parsedJson.content || parsedJson.html || '');
    } catch (parseErr) {
      if (parseErr.code === 'SESSION_EXPIRED') throw parseErr;
      htmlFragment = raw;
    }

    return parseCircularsList(htmlFragment);
  }

  /**
   * Fetch full circular description and attachment from Code Brigade dashboardFeed/display.
   * Observed fields: id, timeStamp, readBit.
   * Target selectors parsed: .ui-feed-title-wrap, .ui-feed-det-title, .ui-feed-det-desc, .ui-feed-det-attach
   *
   * @param {string|number} id Circular item identifier
   * @param {string|number} timeStamp Timestamp of the circular
   * @param {string|number} [readBit='0'] Read indicator flag
   * @param {Object} [session] Optional CodeBrigadeSession document
   * @returns {Promise<Object>} Parsed title, description, paragraphs, department, attachment metadata
   */
  async fetchCircularDetail(id, timeStamp, readBit = '0', session = null) {
    if (!id) {
      throw new Error('Circular ID is required to fetch details.');
    }

    const baseUrl = session?.baseUrl || this.baseUrl || DEFAULT_BASE_URL;
    const fullUrl = `${baseUrl}/dashboardFeed/display`;

    const bodyParams = new URLSearchParams({
      id: String(id),
      timeStamp: String(timeStamp || ''),
      readBit: String(readBit ?? '0'),
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    if (session?.cookies) {
      headers['Cookie'] = session.cookies;
    }

    try {
      const res = await timedFetch(fullUrl, {
        method: 'POST',
        headers,
        body: bodyParams.toString(),
        redirect: 'manual',
      });

      if (res.status === 302 || res.status === 401 || res.status === 403) {
        return {
          success: false,
          supported: false,
          statusCode: res.status,
          message: 'Direct web timeline detail endpoint requires an active CodeIgniter browser session.',
          attachmentNotice: 'No attachment available',
        };
      }

      if (!res.ok) {
        return {
          success: false,
          supported: false,
          statusCode: res.status,
          message: `University server returned HTTP ${res.status}`,
          attachmentNotice: 'No attachment available',
        };
      }

      const html = await res.text();
      const parsed = parseFeedDetailHtml(html);

      if (!parsed.description && !parsed.title) {
        return {
          success: false,
          supported: false,
          statusCode: 200,
          message: 'Full notice details could not be parsed from university portal response.',
          attachmentNotice: 'No attachment available',
        };
      }

      return {
        success: true,
        supported: true,
        statusCode: 200,
        ...parsed,
      };
    } catch (err) {
      console.warn('[CodeBrigade Connector] Notice detail request note:', err.message);
      return {
        success: false,
        supported: false,
        error: err.message,
        message: err.message || 'Full notice details could not be retrieved from university portal.',
        attachmentNotice: 'No attachment available',
      };
    }
  }
}

module.exports = new CodeBrigadeConnector();


