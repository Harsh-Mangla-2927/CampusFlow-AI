/**
 * Attendance Provider Architecture — CampusFlow AI
 *
 * This module defines a provider abstraction for attendance data sources.
 * Currently implemented:
 *   - ManualAttendanceProvider: the default — students mark their own attendance.
 *
 * Planned (requires official API/OAuth from university):
 *   - CodeBrigadeAttendanceProvider: sync from Chitkara Code Brigade system.
 *     ⚠ DISABLED — No official public API or authorized integration exists.
 *     DO NOT scrape. DO NOT bypass authentication.
 *     Enable only when an official authorized endpoint is provided by the university.
 *
 * To add a new provider:
 *   1. Create a class implementing the AttendanceProvider interface below.
 *   2. Register it in getProvider().
 *   3. Configure via environment variables.
 */

'use strict';

const Subject          = require('../models/Subject');
const AttendanceSession = require('../models/AttendanceSession');
const mongoose         = require('mongoose');

// ── Provider Interface ────────────────────────────────────────────────────────
// All providers must implement these methods:
//
//   getAttendance(userId)
//     → Promise<{ subjectId, attended, total, percentage, sessions[] }[]>
//
//   syncAttendance(userId, targetSubjectId?)
//     → Promise<{ synced: number, skipped: number, errors: string[] }>
//
//   isAvailable()
//     → boolean

// ── Manual Attendance Provider ────────────────────────────────────────────────

class ManualAttendanceProvider {
  constructor() {
    this.type = 'manual';
  }

  isAvailable() { return true; }

  async getAttendance(userId) {
    const subjects = await Subject.find({ user: userId, isActive: true }).lean();
    const result = subjects.map(s => ({
      subjectId:   s._id.toString(),
      subjectName: s.name,
      subjectCode: s.code,
      attended:    s.attendedClasses,
      total:       s.totalClasses,
      percentage:  s.totalClasses > 0
        ? Math.round((s.attendedClasses / s.totalClasses) * 100)
        : 0,
      threshold:   s.attendanceThreshold,
      status:      this._computeStatus(s.attendedClasses, s.totalClasses, s.attendanceThreshold),
    }));
    return result;
  }

  _computeStatus(attended, total, threshold) {
    if (!total) return 'NO_DATA';
    const pct = (attended / total) * 100;
    if (pct >= threshold + 5) return 'SAFE';
    if (pct >= threshold)     return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Manual provider doesn't sync — data comes from student input.
   */
  async syncAttendance(_userId) {
    return { synced: 0, skipped: 0, errors: [], message: 'Manual attendance — no sync needed.' };
  }
}

// ── Code Brigade Attendance Provider ─────────────────────────────────────────
// STATUS: DISABLED
//
// Chitkara University's Code Brigade system does not currently expose an
// official public REST API or OAuth endpoint for third-party integrations.
//
// This provider is architecturally complete but intentionally disabled.
// It must NOT be enabled until:
//   1. An official API/OAuth endpoint is provided by Chitkara/Code Brigade.
//   2. The university explicitly authorizes third-party data access.
//   3. Credentials are stored securely in environment variables.
//
// Architecture for future official integration:
//   - OAuth 2.0 or API key authentication
//   - Subject mapping: university subject codes → CampusFlow subject IDs
//   - Reconciliation: compare existing manual records with synced data
//   - Never overwrite manually-corrected records without explicit user consent

class CodeBrigadeAttendanceProvider {
  constructor() {
    this.type    = 'code_brigade';
    this.enabled = process.env.CODE_BRIGADE_ENABLED === 'true';
    this.apiUrl  = process.env.CODE_BRIGADE_API_URL || '';
  }

  isAvailable() {
    if (!this.enabled) return false;
    if (!this.apiUrl)  return false;
    if (!process.env.CODE_BRIGADE_CLIENT_ID) return false;
    return true;
  }

  async getAttendance(_userId) {
    if (!this.isAvailable()) {
      throw new Error(
        'Code Brigade integration is not configured. ' +
        'Set CODE_BRIGADE_ENABLED=true and CODE_BRIGADE_API_URL in your .env ' +
        'when an official API becomes available.'
      );
    }
    // Future implementation:
    // 1. Authenticate with official Code Brigade API
    // 2. Fetch authorized attendance records
    // 3. Map university subject codes to CampusFlow subjects
    // 4. Return normalized attendance data
    throw new Error('Code Brigade provider: not yet implemented.');
  }

  async syncAttendance(userId, subjectMappings = {}) {
    if (!this.isAvailable()) {
      return {
        synced: 0, skipped: 0,
        errors: ['Code Brigade integration not configured.'],
        message: 'Configure CODE_BRIGADE_ENABLED and related env vars to enable sync.',
      };
    }
    // Future reconciliation logic:
    // 1. Fetch attendance from Code Brigade API
    // 2. For each university session:
    //    a. Find matching CampusFlow subject via subjectMappings
    //    b. Check if session already exists (unique: user+subject+date)
    //    c. If new: insert and update subject totals
    //    d. If exists and different: flag for manual review (do NOT overwrite)
    // 3. Return reconciliation summary
    throw new Error('Code Brigade sync: not yet implemented.');
  }
}

// ── Provider Registry ─────────────────────────────────────────────────────────

const PROVIDERS = {
  manual:        new ManualAttendanceProvider(),
  code_brigade:  new CodeBrigadeAttendanceProvider(),
};

/**
 * Get the active attendance provider.
 * Defaults to 'manual' unless CODE_BRIGADE_ENABLED=true and configured.
 */
function getProvider() {
  const codeBrigade = PROVIDERS.code_brigade;
  if (codeBrigade.isAvailable()) return codeBrigade;
  return PROVIDERS.manual;
}

/**
 * Get provider status for API/admin use.
 */
function getProviderStatus() {
  return {
    active: getProvider().type,
    providers: {
      manual:       { available: PROVIDERS.manual.isAvailable(),       type: 'manual' },
      code_brigade: { available: PROVIDERS.code_brigade.isAvailable(), type: 'code_brigade',
        disabled_reason: 'No official Chitkara/Code Brigade API available. Enable when official authorized integration exists.' },
    },
  };
}

module.exports = { getProvider, getProviderStatus, ManualAttendanceProvider, CodeBrigadeAttendanceProvider };
