/**
 * Attendance Calculations Utility — CampusFlow AI
 *
 * Implements deterministic, explainable mathematical calculations for:
 *  - Overall and subject-wise attendance percentages
 *  - Standing status (Good Standing, Warning, Attendance Shortage)
 *  - Consecutive classes required to reach a target percentage:
 *      Required classes = max(0, ceil((target × conducted − attended) / (1 − target)))
 *  - Allowable classes that can be missed while maintaining a target percentage:
 *      Allowable misses = floor((attended − target × conducted) / target) [when attended >= target * conducted]
 *  - Edge case handling: zero classes, 100% target, negative or invalid inputs.
 */

'use strict';

/**
 * Safely parse a number with a fallback.
 */
function safeNumber(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

/**
 * Calculate attendance percentage from attended and conducted counts.
 * Returns rounded to 1 decimal place (e.g. 82.5). Returns 0 if conducted === 0.
 */
function calculatePercentage(attended, conducted) {
  const att = Math.max(0, safeNumber(attended, 0));
  const cond = Math.max(0, safeNumber(conducted, 0));
  if (cond === 0) return 0;
  const pct = (att / cond) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Determine standing classification based on percentage and threshold.
 */
function determineStanding(percentage, threshold = 75, conducted = 0) {
  if (conducted === 0) {
    return {
      status: 'NO_DATA',
      label: 'No Classes Yet',
      isShortage: false,
      color: 'var(--fg-faint)',
      badgeClass: 'badge-neutral',
    };
  }

  const pct = safeNumber(percentage, 0);
  const thresh = safeNumber(threshold, 75);

  if (pct >= thresh + 5) {
    return {
      status: 'GOOD_STANDING',
      label: 'Good Standing',
      isShortage: false,
      color: 'var(--success, #10b981)',
      badgeClass: 'badge-safe',
    };
  }

  if (pct >= thresh) {
    return {
      status: 'WARNING',
      label: 'At Risk Threshold',
      isShortage: false,
      color: 'var(--warning, #f59e0b)',
      badgeClass: 'badge-warning',
    };
  }

  return {
    status: 'SHORTAGE',
    label: 'Attendance Shortage',
    isShortage: true,
    color: 'var(--danger, #ef4444)',
    badgeClass: 'badge-critical',
  };
}

/**
 * Calculate consecutive classes required to reach a target percentage.
 * Formula: Required classes = max(0, ceil((target × conducted − attended) / (1 − target)))
 *
 * Special handling for target = 100% (target = 1.0):
 *  - If conducted === 0 -> 0
 *  - If attended === conducted -> 0
 *  - If attended < conducted -> impossible (return impossible: true)
 */
function calculateClassesToAttend(attended, conducted, targetPercent = 75) {
  const att = Math.max(0, safeNumber(attended, 0));
  const cond = Math.max(0, safeNumber(conducted, 0));
  const targetPct = safeNumber(targetPercent, 75);

  if (targetPct <= 0) {
    return {
      target: targetPct,
      required: 0,
      isMet: true,
      impossible: false,
      message: 'Target is 0% or lower; no classes required.',
    };
  }

  // Handle 100% target separately to prevent division by zero (1 - 1 = 0)
  if (targetPct >= 100) {
    if (cond === 0 || att === cond) {
      return {
        target: 100,
        required: 0,
        isMet: true,
        impossible: false,
        message: 'Current attendance is 100%. Attend all future classes to maintain 100%.',
      };
    }
    return {
      target: 100,
      required: null,
      isMet: false,
      impossible: true,
      message: 'Mathematically impossible to achieve 100% because at least one class has already been missed.',
    };
  }

  const targetDecimal = targetPct / 100;
  const currentPct = cond > 0 ? (att / cond) * 100 : 0;

  if (currentPct >= targetPct && cond > 0) {
    return {
      target: targetPct,
      required: 0,
      isMet: true,
      impossible: false,
      message: `Target of ${targetPct}% is already satisfied.`,
    };
  }

  // Required classes = ceil((target × conducted − attended) / (1 − target))
  const numerator = (targetDecimal * cond) - att;
  const denominator = 1 - targetDecimal;
  // Epsilon rounding to eliminate IEEE-754 precision artifacts (e.g. 2 / 0.19999999999999996)
  const rawRequired = numerator / denominator;
  const roundedRaw = Math.round(rawRequired * 1e8) / 1e8;
  const required = Math.max(0, Math.ceil(roundedRaw));

  return {
    target: targetPct,
    required,
    isMet: required === 0,
    impossible: false,
    message: required > 0
      ? `Attend next ${required} consecutive class${required > 1 ? 'es' : ''} to reach ${targetPct}%.`
      : `Target of ${targetPct}% is satisfied.`,
  };
}

/**
 * Calculate how many classes can be safely missed while staying above the target percentage.
 * Formula: Allowable misses = floor((attended − target × conducted) / target)
 * Only valid when attended >= target * conducted.
 */
function calculateClassesCanMiss(attended, conducted, targetPercent = 75) {
  const att = Math.max(0, safeNumber(attended, 0));
  const cond = Math.max(0, safeNumber(conducted, 0));
  const targetPct = safeNumber(targetPercent, 75);

  if (cond === 0 || att === 0) {
    return {
      target: targetPct,
      canMiss: 0,
      message: 'No classes attended yet; cannot miss any classes.',
    };
  }

  if (targetPct >= 100) {
    return {
      target: 100,
      canMiss: 0,
      message: 'Target is 100%; missing even one class will breach this target.',
    };
  }

  if (targetPct <= 0) {
    return {
      target: targetPct,
      canMiss: cond,
      message: 'Target is 0%; any number of classes may be missed.',
    };
  }

  const targetDecimal = targetPct / 100;
  const currentPct = (att / cond) * 100;

  if (currentPct < targetPct) {
    return {
      target: targetPct,
      canMiss: 0,
      message: `Current attendance (${calculatePercentage(att, cond)}%) is below ${targetPct}%; you cannot afford to miss any classes.`,
    };
  }

  // Allowable misses = floor((attended − target × conducted) / target)
  const marginRaw = (att - targetDecimal * cond) / targetDecimal;
  const roundedMargin = Math.round(marginRaw * 1e8) / 1e8;
  const canMiss = Math.max(0, Math.floor(roundedMargin));

  return {
    target: targetPct,
    canMiss,
    message: canMiss > 0
      ? `You can miss up to ${canMiss} class${canMiss > 1 ? 'es' : ''} while maintaining at least ${targetPct}%.`
      : `You are right at the ${targetPct}% boundary; missing any class will drop you below threshold.`,
  };
}

/**
 * Generate transparent, rule-based attendance insights.
 * Never labels rule-based heuristics as AI or machine learning.
 */
function generateInsights(subjectMetricsList, threshold = 75) {
  const shortageSubjects = [];
  const warningSubjects = [];
  const safeSubjects = [];

  let totalDeficitClasses = 0;

  for (const s of subjectMetricsList) {
    if (s.totalClasses === 0) continue;
    const req = calculateClassesToAttend(s.attendedClasses, s.totalClasses, threshold);
    const miss = calculateClassesCanMiss(s.attendedClasses, s.totalClasses, threshold);

    const item = {
      subjectId: s._id,
      name: s.name,
      code: s.code,
      attendancePercentage: s.attendancePercentage,
      totalClasses: s.totalClasses,
      attendedClasses: s.attendedClasses,
      missedClasses: s.missedClasses,
      classesNeeded: req.required || 0,
      canMiss: miss.canMiss || 0,
      gap: Math.round((threshold - s.attendancePercentage) * 10) / 10,
    };

    if (s.attendancePercentage < threshold) {
      shortageSubjects.push(item);
      totalDeficitClasses += (req.required || 0);
    } else if (s.attendancePercentage < threshold + 5) {
      warningSubjects.push(item);
    } else {
      safeSubjects.push(item);
    }
  }

  // Sort shortage subjects by highest gap descending
  shortageSubjects.sort((a, b) => b.gap - a.gap || b.classesNeeded - a.classesNeeded);

  const highestShortfall = shortageSubjects.length > 0 ? shortageSubjects[0] : null;

  return {
    shortageCount: shortageSubjects.length,
    warningCount: warningSubjects.length,
    safeCount: safeSubjects.length,
    totalDeficitClasses,
    highestShortfall,
    shortageSubjects,
    warningSubjects,
    safeSubjects,
  };
}

module.exports = {
  calculatePercentage,
  determineStanding,
  calculateClassesToAttend,
  calculateClassesCanMiss,
  generateInsights,
  safeNumber,
};
