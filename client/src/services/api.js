/**
 * API Service — CampusFlow AI
 *
 * Centralised Fetch API wrapper for all backend communication.
 * All responses are structured: { success, message, data, errors }
 */

const BASE_URL = '/api';

// ── Token / Session ──────────────────────────────────────────

export const getToken       = () => localStorage.getItem('campusflow_token');
export const getStoredUser  = () => {
  try { return JSON.parse(localStorage.getItem('campusflow_user') || 'null'); }
  catch { return null; }
};
export const saveAuth = (token, user) => {
  localStorage.setItem('campusflow_token', token);
  localStorage.setItem('campusflow_user', JSON.stringify(user));
};
export const updateStoredUser = (user) => {
  localStorage.setItem('campusflow_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('campusflow_token');
  localStorage.removeItem('campusflow_user');
};

// ── Core Request ─────────────────────────────────────────────

/**
 * Make an authenticated API request.
 * On 401, clears auth and fires 'auth:expired' event.
 * Throws an error with .errors field for form-level errors.
 */
const request = async (endpoint, options = {}) => {
  const token = getToken();
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (networkError) {
    const netErr = new Error('Unable to connect to the server. Please ensure the backend is running.');
    netErr.status = 0;
    netErr.errors = { general: 'Unable to connect to the server. Please try again.' };
    throw netErr;
  }

  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      const wasLoggedIn = Boolean(getToken());
      clearAuth();
      if (wasLoggedIn && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    let defaultMsg = `Request failed (${response.status})`;
    if (response.status === 401) defaultMsg = 'Invalid university email or password.';
    else if (response.status === 403) defaultMsg = 'You are not authorized to perform this action.';
    else if (response.status === 404) defaultMsg = 'Requested resource was not found.';
    else if (response.status >= 500) defaultMsg = 'Unable to connect to the server. Please try again.';

    let message = (data && data.message) ? data.message : defaultMsg;

    // Guard against exposing raw OpenSSL, TLS alerts, or internal DB driver stack errors in the UI
    if (
      typeof message === 'string' && (
        message.includes('SSL routines') ||
        message.includes('tlsv1 alert') ||
        message.includes('rec_layer_s3') ||
        message.includes('alert number') ||
        message.includes('MongoServerSelectionError') ||
        message.includes('ECONNREFUSED')
      )
    ) {
      message = 'Authentication service is temporarily unavailable. Please try again in a few moments.';
    }

    const err = new Error(message);
    err.errors = (data && data.errors) || {};
    err.status = response.status;
    throw err;
  }

  return data || { success: true };
};

// ── Auth API ─────────────────────────────────────────────────

export const authAPI = {
  register:       (data) => request('/auth/register',        { method: 'POST', body: JSON.stringify(data) }),
  login:          (data) => request('/auth/login',           { method: 'POST', body: JSON.stringify(data) }),
  verifyOtp:      (data) => request('/auth/verify-otp',      { method: 'POST', body: JSON.stringify(data) }),
  resendOtp:      (data) => request('/auth/resend-otp',      { method: 'POST', body: JSON.stringify(data) }),
  forgotPassword: (data) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword:  (data) => request('/auth/reset-password',  { method: 'POST', body: JSON.stringify(data) }),
  getMe:          ()     => request('/auth/me'),
  updateProfile:  (data) => request('/auth/profile',         { method: 'PUT',  body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/password',        { method: 'PUT',  body: JSON.stringify(data) }),
  uploadProfilePhoto: (formData) => {
    const token = getToken();
    return fetch(`${BASE_URL}/auth/profile/photo`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && data.message) || 'Failed to upload profile photo');
      }
      return data;
    });
  },
  deleteProfilePhoto: () => request('/auth/profile/photo', { method: 'DELETE' }),
};

// ── Subjects API ─────────────────────────────────────────────

export const subjectsAPI = {
  getAll:   ()          => request('/subjects'),
  getOne:   (id)        => request(`/subjects/${id}`),
  create:   (data)      => request('/subjects',           { method: 'POST',   body: JSON.stringify(data) }),
  update:   (id, data)  => request(`/subjects/${id}`,     { method: 'PUT',    body: JSON.stringify(data) }),
  delete:   (id)        => request(`/subjects/${id}`,     { method: 'DELETE' }),
  addMarks: (id, data)  => request(`/subjects/${id}/marks`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── Attendance API ───────────────────────────────────────────

export const attendanceAPI = {
  /**
   * Get Attendly dashboard summary and insights.
   * GET /api/attendance/summary?threshold=75
   */
  getSummary: (threshold = 75) =>
    request(`/attendance/summary${threshold ? `?threshold=${threshold}` : ''}`),

  /**
   * Get detailed attendance register for a subject.
   * GET /api/attendance/subjects/:id/register
   */
  getSubjectRegister: (subjectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/attendance/subjects/${subjectId}/register${query ? `?${query}` : ''}`);
  },

  /**
   * Calculate attendance target and allowable misses.
   * POST /api/attendance/calculator
   */
  calculate: (data) =>
    request('/attendance/calculator', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Connect student Code Brigade account.
   * POST /api/attendance/connect
   */
  connectCodeBrigade: (data) =>
    request('/attendance/connect', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Verify OTP during Code Brigade connection.
   * POST /api/attendance/verify-otp
   */
  verifyCodeBrigadeOtp: (data) =>
    request('/attendance/verify-otp', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Trigger manual sync with Code Brigade.
   * POST /api/attendance/sync
   */
  syncAttendance: () =>
    request('/attendance/sync', { method: 'POST' }),

  /**
   * Disconnect Code Brigade account.
   * POST /api/attendance/disconnect
   */
  disconnectCodeBrigade: () =>
    request('/attendance/disconnect', { method: 'POST' }),

  /**
   * Get verified data source status.
   * GET /api/attendance/source-status
   */
  getSourceStatus: () =>
    request('/attendance/source-status'),

  /**
   * Toggle sample dataset (seed or clear) for demo / evaluation.
   * POST /api/attendance/sample-data
   */
  toggleSampleData: (action = 'seed') =>
    request('/attendance/sample-data', { method: 'POST', body: JSON.stringify({ action }) }),

  /**
   * Quick mark attendance session.
   * POST /api/attendance/mark
   */
  quickMark: (data) =>
    request('/attendance/mark', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Correct attendance session directly.
   * PUT /api/attendance/sessions/:sessionId
   */
  correctSession: (sessionId, data) =>
    request(`/attendance/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Mark a class session as PRESENT or ABSENT.
   * POST /api/subjects/:id/attendance
   * { status: 'PRESENT'|'ABSENT', date?: string, topic?: string, period?: string }
   */
  mark: (subjectId, data) =>
    request(`/subjects/${subjectId}/attendance`, { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Correct an existing attendance session.
   * PUT /api/subjects/:id/attendance/:sessionId
   */
  correct: (subjectId, sessionId, data) =>
    request(`/subjects/${subjectId}/attendance/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Get paginated attendance history for a subject.
   * GET /api/subjects/:id/attendance
   */
  history: (subjectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/subjects/${subjectId}/attendance${query ? `?${query}` : ''}`);
  },

  /** Get all subjects (for the attendance overview page) */
  getSubjects: () => request('/subjects'),
};

// ── Tasks API ─────────────────────────────────────────────────

export const tasksAPI = {
  getAll:  (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/tasks${q ? `?${q}` : ''}`); },
  getOne:  (id)          => request(`/tasks/${id}`),
  create:  (data)        => request('/tasks',         { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data)    => request(`/tasks/${id}`,   { method: 'PUT',    body: JSON.stringify(data) }),
  delete:  (id)          => request(`/tasks/${id}`,   { method: 'DELETE' }),
};

// ── Exams API ─────────────────────────────────────────────────

export const examsAPI = {
  getAll:  ()           => request('/exams'),
  getOne:  (id)         => request(`/exams/${id}`),
  create:  (data)       => request('/exams',          { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data)   => request(`/exams/${id}`,    { method: 'PUT',    body: JSON.stringify(data) }),
  delete:  (id)         => request(`/exams/${id}`,    { method: 'DELETE' }),
};

// ── Study Plans API ───────────────────────────────────────────

export const studyPlansAPI = {
  getAll:    ()              => request('/study-plans'),
  create:    (data)          => request('/study-plans',                          { method: 'POST', body: JSON.stringify(data) }),
  toggleDay: (id, dayIndex)  => request(`/study-plans/${id}/schedule/${dayIndex}`, { method: 'PUT' }),
  delete:    (id)            => request(`/study-plans/${id}`,                   { method: 'DELETE' }),
};

// ── Intelligence API ──────────────────────────────────────────

export const intelligenceAPI = {
  getDashboard:     () => request('/dashboard'),
  getAnalytics:     () => request('/analytics'),
  getPriorities:    () => request('/priorities'),
  getRisks:         () => request('/risks'),
  getConflicts:     () => request('/conflicts'),
  getRecommendations: () => request('/recommendations'),
};

// ── Contact API ───────────────────────────────────────────────

export const contactAPI = {
  send: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Health Check ──────────────────────────────────────────────

export const healthAPI = { check: () => request('/health') };

