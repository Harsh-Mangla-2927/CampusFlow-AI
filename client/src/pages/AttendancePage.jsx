import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Calendar,
  Layers,
  Info,
  Clock,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  Database,
  ChevronRight,
  Calculator,
  Flame,
  Award,
  Sparkles,
  BookOpen,
  Link2,
  Unlink,
  KeyRound,
  Lock,
  User,
  GraduationCap
} from 'lucide-react';
import { attendanceAPI, subjectsAPI } from '../services/api';
import { Modal, LoadingState, ErrorState, EmptyState } from '../components/SharedComponents';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';

export default function AttendancePage() {
  const { toast } = useToast();

  // Core Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [threshold, setThreshold] = useState(75);

  // Subject Register Modal State
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [registerData, setRegisterData] = useState(null);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [registerFilter, setRegisterFilter] = useState('ALL'); // 'ALL' | 'PRESENT' | 'ABSENT'

  // Quick Mark Attendance Modal State
  const [markModalOpen, setMarkModalOpen] = useState(false);
  const [markSubjectId, setMarkSubjectId] = useState('');
  const [markStatus, setMarkStatus] = useState('PRESENT');
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [markPeriod, setMarkPeriod] = useState('Lecture 1 (09:00 - 10:00 AM)');
  const [markTopic, setMarkTopic] = useState('');
  const [submittingMark, setSubmittingMark] = useState(false);

  // Connect Code Brigade Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [cbUsername, setCbUsername] = useState('');
  const [cbPassword, setCbPassword] = useState('');
  const [cbSchoolCode, setCbSchoolCode] = useState('800002'); // CUIET Chitkara
  const [connecting, setConnecting] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [authUserId, setAuthUserId] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [deviceUUID, setDeviceUUID] = useState('');
  const [cbOtpText, setCbOtpText] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  // Custom Simulator / Calculator State
  const [calcSubjectId, setCalcSubjectId] = useState('OVERALL');
  const [calcTarget, setCalcTarget] = useState(75);
  const [customAttended, setCustomAttended] = useState('');
  const [customConducted, setCustomConducted] = useState('');

  // Source Notice Modal State
  const [sourceNoticeOpen, setSourceNoticeOpen] = useState(false);
  const [togglingSample, setTogglingSample] = useState(false);

  // Fetch Dashboard Summary
  const fetchSummary = useCallback(async (customThresh = threshold, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const res = await attendanceAPI.getSummary(customThresh);
      if (res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve attendance dashboard data.');
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
      setSyncing(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchSummary(threshold);
  }, [fetchSummary, threshold]);

  // Handle Manual Refresh
  const handleManualRefresh = async () => {
    setRefreshing(true);
    // If Code Brigade is connected, attempt a live sync first
    if (dashboardData?.dataSource?.isConnected) {
      handleSyncAttendance();
    } else {
      fetchSummary(threshold, true);
      toast.info('Refreshed local attendance records.');
    }
  };

  // Trigger live synchronization with Code Brigade
  const handleSyncAttendance = async () => {
    setSyncing(true);
    toast.info('Connecting to Code Brigade to synchronize attendance…');
    try {
      const res = await attendanceAPI.syncAttendance();
      if (res.data) setDashboardData(res.data);
      toast.success('Live attendance synchronized with Code Brigade!');
    } catch (err) {
      // Retain last valid data on error
      if (err.data) setDashboardData(err.data);
      toast.error(err.message || 'Failed to sync with university server. Showing last valid records.');
    } finally {
      setSyncing(false);
      setRefreshing(false);
    }
  };

  // Connect Code Brigade credentials
  const handleConnectCodeBrigade = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await attendanceAPI.connectCodeBrigade({
        username: cbUsername,
        password: cbPassword,
        schoolCode: cbSchoolCode,
      });

      if (res.requiresOTP) {
        setOtpRequired(true);
        setAuthUserId(res.data.authUserId);
        setOtpHint(res.data.otpHint);
        setDeviceUUID(res.data.deviceUUID);
        toast.info(res.message || 'OTP sent by university portal. Please verify.');
        return;
      }

      if (res.syncSuccess) {
        toast.success(res.message || `Connected! ${res.syncedSubjects || 0} university courses synchronized.`);
      } else {
        toast.warning(res.message || 'Connected, but university attendance synchronization is pending.');
      }

      if (res.data) setDashboardData(res.data);
      setConnectModalOpen(false);
      setCbPassword('');
      setOtpRequired(false);
    } catch (err) {
      toast.error(err.message || 'Failed to connect to Code Brigade.');
    } finally {
      setConnecting(false);
    }
  };

  // Verify OTP for Code Brigade
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setConnecting(true);
    try {
      const res = await attendanceAPI.verifyCodeBrigadeOtp({
        authUserId,
        otpText: cbOtpText,
        deviceUUID,
      });

      if (res.syncSuccess) {
        toast.success(res.message || `Connected! ${res.syncedSubjects || 0} university courses synchronized.`);
      } else {
        toast.warning(res.message || 'OTP verified, but live attendance sync is pending.');
      }

      if (res.data) setDashboardData(res.data);
      setConnectModalOpen(false);
      setOtpRequired(false);
      setCbOtpText('');
      setCbPassword('');
    } catch (err) {
      toast.error(err.message || 'OTP verification failed.');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect Code Brigade
  const handleDisconnectCodeBrigade = async () => {
    if (!window.confirm('Are you sure you want to unlink Code Brigade? Your current records will remain saved locally.')) {
      return;
    }
    setDisconnecting(true);
    try {
      const res = await attendanceAPI.disconnectCodeBrigade();
      toast.success(res.message || 'Code Brigade account unlinked.');
      if (res.data) setDashboardData(res.data);
      setSourceNoticeOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to unlink Code Brigade.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleThresholdChange = (val) => {
    const num = Math.min(100, Math.max(1, Number(val)));
    setThreshold(num);
  };

  // Open Detailed Register for Subject
  const openSubjectRegister = async (subject) => {
    setSelectedSubject(subject);
    setLoadingRegister(true);
    setRegisterFilter('ALL');
    try {
      const res = await attendanceAPI.getSubjectRegister(subject._id, { limit: 100 });
      setRegisterData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch attendance register.');
    } finally {
      setLoadingRegister(false);
    }
  };

  // Toggle or Correct Session Status in Register
  const handleToggleSessionStatus = async (sessionId, currentStatus) => {
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    try {
      await attendanceAPI.correctSession(sessionId, { status: newStatus });
      toast.success(`Attendance updated to ${newStatus}.`);

      // Update local register view
      if (registerData && registerData.sessions) {
        setRegisterData(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => s._id === sessionId ? { ...s, status: newStatus, source: 'MANUAL' } : s),
        }));
      }

      // Quietly update summary
      fetchSummary(threshold, true);
    } catch (err) {
      toast.error(err.message || 'Failed to update attendance session.');
    }
  };

  // Quick Mark Attendance
  const handleQuickMarkSubmit = async (e) => {
    e.preventDefault();
    if (!markSubjectId) {
      toast.error('Please select a subject.');
      return;
    }
    setSubmittingMark(true);
    try {
      await attendanceAPI.quickMark({
        subjectId: markSubjectId,
        status: markStatus,
        date: markDate,
        period: markPeriod,
        topic: markTopic,
      });
      toast.success(`Class recorded as ${markStatus}.`);
      setMarkModalOpen(false);
      setMarkTopic('');
      fetchSummary(threshold, true);
    } catch (err) {
      if (err.status === 409) {
        toast.warning('Attendance already recorded for this subject on the selected date.');
      } else {
        toast.error(err.message || 'Failed to mark class session.');
      }
    } finally {
      setSubmittingMark(false);
    }
  };

  // Toggle Sample Demo Dataset
  const handleToggleSampleDataset = async (action) => {
    setTogglingSample(true);
    try {
      const res = await attendanceAPI.toggleSampleData(action);
      toast.success(res.message || 'Dataset updated.');
      if (res.data) setDashboardData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle sample dataset.');
    } finally {
      setTogglingSample(false);
      setSourceNoticeOpen(false);
    }
  };

  // Calculator Logic
  const calcData = useMemo(() => {
    if (!dashboardData) return null;

    let att = 0;
    let cond = 0;
    let label = '';

    if (calcSubjectId === 'OVERALL') {
      att = dashboardData.overall.attendedClasses;
      cond = dashboardData.overall.totalClasses;
      label = 'Overall Coursework';
    } else if (calcSubjectId === 'CUSTOM') {
      att = Math.max(0, Number(customAttended) || 0);
      cond = Math.max(0, Number(customConducted) || 0);
      label = 'Custom Simulation';
    } else {
      const subj = dashboardData.subjects.find(s => s._id === calcSubjectId);
      if (subj) {
        att = subj.attendedClasses;
        cond = subj.totalClasses;
        label = subj.name;
      }
    }

    const currentPct = cond > 0 ? Math.round((att / cond) * 1000) / 10 : 0;
    const targetPct = Number(calcTarget) || 75;

    // Consecutive classes required: max(0, ceil((target * cond - att) / (1 - target)))
    let required = 0;
    let impossible = false;
    let isMet = false;
    let requiredMessage = '';

    if (targetPct >= 100) {
      if (cond === 0 || att === cond) {
        required = 0;
        isMet = true;
        requiredMessage = 'Currently 100%. Attend all future lectures to stay at 100%.';
      } else {
        impossible = true;
        required = null;
        requiredMessage = 'Mathematically impossible to reach 100% because at least one class has been missed.';
      }
    } else {
      const targetDecimal = targetPct / 100;
      if (currentPct >= targetPct && cond > 0) {
        required = 0;
        isMet = true;
        requiredMessage = `Target of ${targetPct}% is already achieved!`;
      } else {
        const num = (targetDecimal * cond) - att;
        const den = 1 - targetDecimal;
        const rawReq = num / den;
        const roundedRaw = Math.round(rawReq * 1e8) / 1e8;
        required = Math.max(0, Math.ceil(roundedRaw));
        requiredMessage = `Must attend the next ${required} consecutive class${required > 1 ? 'es' : ''} to reach ${targetPct}%.`;
      }
    }

    // Allowable misses: floor((att - target * cond) / target)
    let canMiss = 0;
    let canMissMessage = '';

    if (cond === 0 || att === 0 || targetPct >= 100) {
      canMiss = 0;
      canMissMessage = targetPct >= 100 ? 'Target is 100%; zero misses allowed.' : 'No buffer available.';
    } else {
      const targetDecimal = targetPct / 100;
      if (currentPct < targetPct) {
        canMiss = 0;
        canMissMessage = `Below target; you cannot afford to miss any classes.`;
      } else {
        const marginRaw = (att - targetDecimal * cond) / targetDecimal;
        const roundedMargin = Math.round(marginRaw * 1e8) / 1e8;
        canMiss = Math.max(0, Math.floor(roundedMargin));
        canMissMessage = canMiss > 0
          ? `You can safely miss up to ${canMiss} class${canMiss > 1 ? 'es' : ''} without dropping below ${targetPct}%.`
          : `At boundary threshold; missing the next class drops you below ${targetPct}%.`;
      }
    }

    return {
      label,
      attended: att,
      conducted: cond,
      percentage: currentPct,
      target: targetPct,
      required,
      impossible,
      isMet,
      requiredMessage,
      canMiss,
      canMissMessage,
    };
  }, [dashboardData, calcSubjectId, calcTarget, customAttended, customConducted]);

  if (loading) {
    return (
      <div className="page-container">
        <LoadingState message="Loading Attendly Attendance Dashboard…" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="page-container">
        <ErrorState
          message={error || 'Attendance dashboard unavailable.'}
          onRetry={() => fetchSummary(threshold)}
        />
      </div>
    );
  }

  const { overall, subjects, insights, dataSource } = dashboardData;

  // Filtered register sessions
  const filteredSessions = (registerData?.sessions || []).filter(s => {
    if (registerFilter === 'PRESENT') return s.status === 'PRESENT';
    if (registerFilter === 'ABSENT') return s.status === 'ABSENT';
    return true;
  });

  // Calculate SVG Circle circumference for 180px diameter (r = 74, circumference = 2 * π * 74 ≈ 464.95)
  const circleRadius = 74;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circumference - (Math.min(100, Math.max(0, overall.attendancePercentage)) / 100) * circumference;

  return (
    <div className="page-container">
      <div className="attendly-dashboard">

        {/* ── HEADER & CONTEXT BAR ────────────────────────────── */}
        <header className="attendly-header">
          <div>
            <div className="attendly-kicker">
              <Sparkles size={13} aria-hidden="true" />
              Attendly Protocol · Academic Intelligence
            </div>
            <h1 className="attendly-title">Attendance Intelligence</h1>
            <p className="attendly-subtitle">
              Official university synchronization, session-by-session registers, and shortfall prevention.
            </p>
          </div>

          <div className="attendly-header-actions">
            {/* Real Data Source Status Badge & Action */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSourceNoticeOpen(true)}
              id="btn-source-status"
              title="Inspect data source & synchronization status"
            >
              <Database
                size={13}
                style={{
                  color: dataSource.isLive
                    ? 'var(--success)'
                    : dataSource.isStale
                    ? 'var(--warning)'
                    : dataSource.isSample
                    ? 'var(--accent)'
                    : 'var(--fg-faint)',
                }}
                aria-hidden="true"
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {dataSource.isLive
                  ? 'Live University Data'
                  : dataSource.isStale
                  ? 'University Stale'
                  : dataSource.provider === 'CODE_BRIGADE_SYNC_PENDING'
                  ? 'University Sync Pending'
                  : dataSource.provider === 'CODE_BRIGADE_EXPIRED'
                  ? 'Session Expired'
                  : dataSource.isSample
                  ? 'Sample Demo Mode'
                  : dataSource.provider === 'CAMPUSFLOW_LOCAL'
                  ? 'Local Records'
                  : 'Not Connected (0 Classes)'}
              </span>
            </button>

            {/* Connect / Sync Code Brigade Button */}
            {dataSource.isConnected ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSyncAttendance}
                disabled={syncing}
                id="btn-sync-codebrigade"
                title="Synchronize official attendance from Code Brigade"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
                {syncing ? 'Syncing…' : 'Sync University'}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setConnectModalOpen(true)}
                id="btn-connect-codebrigade"
              >
                <Link2 size={13} aria-hidden="true" />
                Connect Code Brigade
              </button>
            )}

            {/* Quick Mark Class Button */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (subjects.length > 0) setMarkSubjectId(subjects[0]._id);
                setMarkModalOpen(true);
              }}
              id="btn-quick-mark"
            >
              <PlusCircle size={13} aria-hidden="true" />
              Mark Class
            </button>

            {/* Refresh Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleManualRefresh}
              disabled={refreshing || syncing}
              id="btn-refresh-attendance"
            >
              <RefreshCw size={13} className={refreshing || syncing ? 'animate-spin' : ''} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </header>

        {/* ── NOT CONNECTED CALLOUT (When student has 0 classes) ── */}
        {!dataSource.isConnected && !dataSource.isSample && overall.totalClasses === 0 && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent)',
            borderLeft: '4px solid var(--accent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)' }}>
                No Attendance Records Connected
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>
                Your account currently has 0 classes recorded. Connect your university Code Brigade credentials to sync your official courses, or load our verified demo set to explore the dashboard.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setConnectModalOpen(true)}
              >
                <Link2 size={13} aria-hidden="true" />
                Connect Code Brigade
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleToggleSampleDataset('seed')}
                disabled={togglingSample}
              >
                Load Demo Set
              </button>
            </div>
          </div>
        )}

        {/* ── SYNC PENDING CALLOUT (When student is connected but 0 classes imported) ── */}
        {dataSource.isConnected && !dataSource.isSample && overall.totalClasses === 0 && (
          <div style={{
            padding: '16px 20px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--warning)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--fg-primary)' }}>
                University Account Connected · Attendance Sync Pending
              </div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 2 }}>
                {dataSource.notice || `Connected as ${dataSource.studentName || 'Student'}. Official attendance records have not yet been synchronized from the university register.`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSyncAttendance}
                disabled={syncing}
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
                {syncing ? 'Synchronizing…' : 'Sync University Register'}
              </button>
            </div>
          </div>
        )}

        {/* ── SECTION A: OVERALL ATTENDANCE HERO CARD ──────────── */}
        <section aria-labelledby="overall-attendance-heading">
          <div className="attendly-hero-grid">
            {/* Circular Progress Gauge */}
            <div className="attendly-circle-container">
              <div className="attendly-circle-svg-wrapper">
                <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Background Track */}
                  <circle
                    cx="90"
                    cy="90"
                    r={circleRadius}
                    fill="transparent"
                    stroke="var(--border)"
                    strokeWidth="12"
                  />
                  {/* Progress Ring */}
                  <circle
                    cx="90"
                    cy="90"
                    r={circleRadius}
                    fill="transparent"
                    stroke={overall.color || 'var(--accent)'}
                    strokeWidth="12"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="square"
                    style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
                  />
                </svg>

                <div className="attendly-circle-center-text">
                  <span className="attendly-circle-pct" style={{ color: overall.color || 'var(--fg-primary)' }}>
                    {overall.attendancePercentage}%
                  </span>
                  <span className="attendly-circle-label">Overall Rate</span>
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${overall.color}`,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: overall.color,
                }}
              >
                <div style={{ width: 6, height: 6, background: overall.color }} />
                {overall.standingLabel}
              </div>
            </div>

            {/* Metrics Breakdown & Threshold Bar */}
            <div className="attendly-hero-details">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s3)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-faint)' }}>
                    Cumulative Term Statistics
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                    {subjects.length} active subject{subjects.length === 1 ? '' : 's'}
                    {dataSource.studentName ? ` • ${dataSource.studentName}` : ''}
                  </span>
                </div>

                <div className="attendly-stats-row">
                  <div className="attendly-stat-box">
                    <span className="attendly-stat-title">Total Conducted</span>
                    <span className="attendly-stat-value">{overall.totalClasses}</span>
                    <span className="attendly-stat-hint">Scheduled Lectures</span>
                  </div>

                  <div className="attendly-stat-box">
                    <span className="attendly-stat-title">Classes Attended</span>
                    <span className="attendly-stat-value" style={{ color: 'var(--success)' }}>{overall.attendedClasses}</span>
                    <span className="attendly-stat-hint">{overall.attendancePercentage}% attendance</span>
                  </div>

                  <div className="attendly-stat-box">
                    <span className="attendly-stat-title">Classes Missed</span>
                    <span className="attendly-stat-value" style={{ color: overall.missedClasses > 0 ? 'var(--danger)' : 'var(--fg-primary)' }}>
                      {overall.missedClasses}
                    </span>
                    <span className="attendly-stat-hint">
                      {overall.totalClasses > 0 ? `${Math.round((overall.missedClasses / overall.totalClasses) * 1000) / 10}% missed` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Threshold Selection Control */}
              <div className="attendly-threshold-control">
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)' }}>
                    Institutional Threshold Target
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                    Standard University requirement is 75%. Adjust to simulate strict policies.
                  </div>
                </div>

                <div className="attendly-threshold-pills">
                  {[70, 75, 80, 85, 90].map(val => (
                    <button
                      key={val}
                      className={`attendly-pill-btn${threshold === val ? ' active' : ''}`}
                      onClick={() => handleThresholdChange(val)}
                      id={`btn-threshold-${val}`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Overall Recovery / Buffer Notification */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${overall.color}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 12,
                color: 'var(--fg-secondary)',
              }}>
                <Info size={16} style={{ color: overall.color, flexShrink: 0 }} aria-hidden="true" />
                <span>
                  {overall.isTargetMet
                    ? (overall.classesCanMiss > 0
                        ? `Buffer confirmed: You can safely miss up to ${overall.classesCanMiss} lectures across your course load while remaining above ${threshold}%.`
                        : `Target met: You are currently maintaining the institutional target of ${threshold}%.`)
                    : overall.recoveryMessage}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION B: SUBJECT-WISE ATTENDANCE GRID ─────────── */}
        <section aria-labelledby="subjects-attendance-heading">
          <div className="attendly-subjects-header">
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-faint)' }}>
                Coursework Breakdown
              </div>
              <h2 id="subjects-attendance-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg-primary)' }}>
                Subject Registers
              </h2>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                Threshold Marker: {threshold}%
              </span>
            </div>
          </div>

          {subjects.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={24} />}
              title="No Subject Records"
              description="Connect your university Code Brigade account to import official subjects, or seed the demo dataset."
              action={
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setConnectModalOpen(true)}>
                    Connect Code Brigade
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleToggleSampleDataset('seed')}>
                    Load Demo Dataset
                  </button>
                </div>
              }
            />
          ) : (
            <div className="attendly-subjects-grid">
              {subjects.map(subj => {
                const pct = subj.attendancePercentage;
                const isShortage = subj.status === 'SHORTAGE' || subj.status === 'CRITICAL';
                const statusColor = subj.colorHex || (pct >= threshold + 5 ? 'var(--success)' : pct >= threshold ? 'var(--warning)' : 'var(--danger)');

                return (
                  <div key={subj._id} className="attendly-subject-card">
                    {/* Header */}
                    <div>
                      <div className="attendly-card-header">
                        <div>
                          <div className="attendly-subject-name">{subj.name}</div>
                          <div className="attendly-subject-meta">
                            <span>{subj.code}</span>
                            {subj.source === 'CODE_BRIGADE' && (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>• OFFICIAL</span>
                            )}
                            {subj.teacher && <span>• {subj.teacher}</span>}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div className="attendly-subject-pct-badge" style={{ color: statusColor }}>
                            {pct}%
                          </div>
                          <span
                            className="attendly-subject-standing-badge"
                            style={{
                              background: 'var(--bg-elevated)',
                              border: `1px solid ${statusColor}`,
                              color: statusColor,
                            }}
                          >
                            {subj.standingLabel}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar with target notch */}
                      <div className="attendly-progress-wrapper">
                        <div className="attendly-progress-track">
                          <div
                            className="attendly-progress-fill"
                            style={{
                              width: `${Math.min(100, Math.max(0, pct))}%`,
                              background: statusColor,
                            }}
                          />
                          {/* 75% / threshold vertical marker */}
                          <div
                            className="attendly-threshold-indicator"
                            style={{ left: `${threshold}%` }}
                            title={`Threshold marker: ${threshold}%`}
                          />
                        </div>
                      </div>

                      {/* Attended / Conducted / Missed Row */}
                      <div className="attendly-metrics-row">
                        <div className="attendly-metric-item">
                          <span>Attended</span>
                          <span>{subj.attendedClasses}</span>
                        </div>
                        <div className="attendly-metric-item">
                          <span>Conducted</span>
                          <span>{subj.totalClasses}</span>
                        </div>
                        <div className="attendly-metric-item">
                          <span>Missed</span>
                          <span style={{ color: subj.missedClasses > 0 ? 'var(--danger)' : 'inherit' }}>
                            {subj.missedClasses}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Actions */}
                    <div>
                      <div className="attendly-card-advice" style={{ marginBottom: 'var(--s3)' }}>
                        {isShortage ? (
                          <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                            Deficit: Attend next {subj.classesNeededForThreshold} class{subj.classesNeededForThreshold === 1 ? '' : 'es'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--fg-muted)' }}>
                            {subj.classesCanMiss > 0
                              ? `Buffer: Can safely miss ${subj.classesCanMiss} class${subj.classesCanMiss === 1 ? '' : 'es'}`
                              : `Threshold maintained (${pct}%)`}
                          </span>
                        )}
                      </div>

                      <div className="attendly-card-footer">
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => {
                            setMarkSubjectId(subj._id);
                            setMarkModalOpen(true);
                          }}
                        >
                          <PlusCircle size={12} aria-hidden="true" />
                          Mark
                        </button>

                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, padding: '4px 10px', color: 'var(--accent)' }}
                          onClick={() => openSubjectRegister(subj)}
                          id={`btn-view-register-${subj.code}`}
                        >
                          Register
                          <ChevronRight size={12} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION D: ATTENDANCE CALCULATOR ────────────────── */}
        <section aria-labelledby="calculator-heading">
          <div className="attendly-calculator-card">
            <div style={{ marginBottom: 'var(--s5)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                Mathematical Simulation
              </div>
              <h2 id="calculator-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg-primary)' }}>
                Consecutive Attendance Calculator
              </h2>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
                Compute how many consecutive future classes must be attended to reach your target, or how many classes you can afford to skip.
              </p>
            </div>

            <div className="attendly-calc-grid">
              {/* Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
                {/* Subject Selector */}
                <div>
                  <label className="form-label" htmlFor="calc-subject-select">Select Subject Scope</label>
                  <select
                    id="calc-subject-select"
                    className="form-input"
                    value={calcSubjectId}
                    onChange={e => setCalcSubjectId(e.target.value)}
                  >
                    <option value="OVERALL">Aggregate (All Subjects Combined)</option>
                    {subjects.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code}) — Currently {s.attendancePercentage}%
                      </option>
                    ))}
                    <option value="CUSTOM">Custom Value Simulator</option>
                  </select>
                </div>

                {/* Custom inputs if chosen */}
                {calcSubjectId === 'CUSTOM' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label" htmlFor="custom-attended">Classes Attended</label>
                      <input
                        id="custom-attended"
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="e.g. 15"
                        value={customAttended}
                        onChange={e => setCustomAttended(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="custom-conducted">Total Conducted</label>
                      <input
                        id="custom-conducted"
                        type="number"
                        min="1"
                        className="form-input"
                        placeholder="e.g. 20"
                        value={customConducted}
                        onChange={e => setCustomConducted(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Target percentage selector */}
                <div>
                  <label className="form-label">Desired Target Percentage</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {[75, 80, 85, 90, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        className={`attendly-pill-btn${calcTarget === pct ? ' active' : ''}`}
                        onClick={() => setCalcTarget(pct)}
                        id={`btn-calc-target-${pct}`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Formula Callout */}
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg-faint)',
                  lineHeight: 1.6,
                }}>
                  <strong style={{ color: 'var(--fg-secondary)' }}>Formula:</strong> Required = max(0, ⌈(target × conducted − attended) / (1 − target)⌉)
                  <br />
                  <span style={{ fontSize: 10 }}>Assumes future lectures are attended without interruption. Not an official university guarantee.</span>
                </div>
              </div>

              {/* Live Calculated Results */}
              {calcData && (
                <div className="attendly-calc-result-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                      Target: {calcData.target}%
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--fg-primary)' }}>
                      Current: {calcData.percentage}% ({calcData.attended}/{calcData.conducted})
                    </span>
                  </div>

                  {/* Consecutive Needed */}
                  <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      Consecutive Classes Required
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 32,
                      fontWeight: 900,
                      color: calcData.impossible ? 'var(--danger)' : calcData.required > 0 ? 'var(--accent)' : 'var(--success)',
                      margin: '4px 0',
                    }}>
                      {calcData.impossible ? 'Impossible' : calcData.required}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                      {calcData.requiredMessage}
                    </p>
                  </div>

                  {/* Allowable Misses */}
                  <div style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)', textTransform: 'uppercase' }}>
                      Safe Miss Margin (Bunk Allowance)
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 32,
                      fontWeight: 900,
                      color: calcData.canMiss > 0 ? 'var(--success)' : 'var(--fg-faint)',
                      margin: '4px 0',
                    }}>
                      {calcData.canMiss}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                      {calcData.canMissMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION E: EXPLAINABLE ATTENDANCE INSIGHTS ───────── */}
        <section aria-labelledby="insights-heading">
          <div className="attendly-insights-card">
            <div style={{ marginBottom: 'var(--s5)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                Rule-Based Analysis
              </div>
              <h2 id="insights-heading" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg-primary)' }}>
                Actionable Academic Insights
              </h2>
            </div>

            <div className="attendly-insights-grid">
              {/* Shortfall overview */}
              <div className="attendly-insight-item">
                <span className="attendly-insight-kicker" style={{ color: insights.shortageCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {insights.shortageCount > 0 ? 'Shortfall Alert' : 'Good Standing'}
                </span>
                <div className="attendly-insight-title">
                  {insights.shortageCount > 0
                    ? `${insights.shortageCount} Subject${insights.shortageCount > 1 ? 's' : ''} Below ${threshold}%`
                    : `All Subjects Meet Institutional Cutoff`}
                </div>
                <div className="attendly-insight-desc">
                  {insights.shortageCount > 0
                    ? `A cumulative recovery of ${insights.totalDeficitClasses} consecutive lectures is required to bring all subjects back to standard compliance.`
                    : `Zero attendance shortages detected. All course modules currently satisfy the institutional threshold of ${threshold}%.`}
                </div>
              </div>

              {/* Largest Shortfall */}
              {insights.highestShortfall && (
                <div className="attendly-insight-item">
                  <span className="attendly-insight-kicker" style={{ color: 'var(--danger)' }}>
                    Immediate Priority
                  </span>
                  <div className="attendly-insight-title">
                    {insights.highestShortfall.name} ({insights.highestShortfall.attendancePercentage}%)
                  </div>
                  <div className="attendly-insight-desc">
                    Exhibits the highest deficit at {insights.highestShortfall.gap}% below threshold. Attend the next {insights.highestShortfall.classesNeeded} consecutive lectures to recover safe standing.
                  </div>
                </div>
              )}

              {/* Safest buffer */}
              <div className="attendly-insight-item">
                <span className="attendly-insight-kicker" style={{ color: 'var(--success)' }}>
                  Highest Attendance Margin
                </span>
                <div className="attendly-insight-title">
                  {insights.safeSubjects.length > 0
                    ? `${insights.safeSubjects[0].name} (${insights.safeSubjects[0].attendancePercentage}%)`
                    : 'No High-Buffer Subjects'}
                </div>
                <div className="attendly-insight-desc">
                  {insights.safeSubjects.length > 0
                    ? `Currently holds a safety buffer permitting up to ${insights.safeSubjects[0].canMiss} allowable absence${insights.safeSubjects[0].canMiss === 1 ? '' : 's'} while staying compliant.`
                    : 'Attendance is strictly balanced across all course modules.'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION F: DATA SOURCE & VERIFICATION STATUS ───── */}
        <section aria-labelledby="datasource-heading">
          <div className="attendly-source-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ShieldCheck
                  size={16}
                  style={{ color: dataSource.isLive ? 'var(--success)' : dataSource.isStale ? 'var(--warning)' : 'var(--accent)' }}
                  aria-hidden="true"
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-primary)' }}>
                  Data Integrity & Synchronization Engine
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', maxWidth: 680, lineHeight: 1.5 }}>
                Current Provider: <strong>{dataSource.providerLabel}</strong>.
                {dataSource.lastSyncedAt && (
                  <span> Last synchronized at {formatDate(dataSource.lastSyncedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.</span>
                )}
                <br />
                {dataSource.notice}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {dataSource.isConnected ? (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSyncAttendance}
                    disabled={syncing}
                    id="btn-sync-bottom"
                  >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} aria-hidden="true" />
                    {syncing ? 'Syncing…' : 'Sync Live Data'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={handleDisconnectCodeBrigade}
                    disabled={disconnecting}
                    style={{ color: 'var(--danger)' }}
                  >
                    <Unlink size={13} aria-hidden="true" />
                    Unlink Account
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setConnectModalOpen(true)}
                    id="btn-connect-bottom"
                  >
                    <Link2 size={13} aria-hidden="true" />
                    Connect Code Brigade
                  </button>

                  {dataSource.isSample ? (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleSampleDataset('clear')}
                      disabled={togglingSample}
                    >
                      Clear Demo Set
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleToggleSampleDataset('seed')}
                      disabled={togglingSample}
                    >
                      Load Demo Set
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* ── MODAL: CONNECT CODE BRIGADE ACCOUNT ──────────────── */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => { setConnectModalOpen(false); setOtpRequired(false); }}
        title="Connect Code Brigade University Portal"
        maxWidth={500}
      >
        {!otpRequired ? (
          <form onSubmit={handleConnectCodeBrigade}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--fg-secondary)',
                lineHeight: 1.5,
              }}>
                <div style={{ color: 'var(--fg-primary)', fontWeight: 700, marginBottom: 2 }}>
                  Direct University Integration
                </div>
                Connect your official <strong>Chitkara University (CUIET)</strong> Chalkpad Pro account.
                Credentials are processed securely on your isolated server; passwords are never persisted.
              </div>

              <div>
                <label className="form-label" htmlFor="cb-school">University Institute Code</label>
                <input
                  id="cb-school"
                  type="text"
                  className="form-input"
                  value={cbSchoolCode}
                  onChange={e => setCbSchoolCode(e.target.value)}
                  placeholder="800002"
                  disabled
                  title="CUIET Chitkara University (800002)"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="cb-user">University Roll No / Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="cb-user"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 241099xxxx or student email"
                    value={cbUsername}
                    onChange={e => setCbUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="cb-pass">University Password</label>
                <input
                  id="cb-pass"
                  type="password"
                  className="form-input"
                  placeholder="Chalkpad Pro login password"
                  value={cbPassword}
                  onChange={e => setCbPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConnectModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={connecting}
                >
                  {connecting ? 'Authenticating with University…' : 'Connect & Import Attendance'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              <div style={{
                padding: '12px 14px',
                background: 'rgba(255, 61, 0, 0.08)',
                border: '1px solid var(--accent)',
                fontSize: 12,
                color: 'var(--fg-primary)',
              }}>
                <strong>OTP Verification Required</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--fg-muted)' }}>
                  Chalkpad Pro issued an OTP to your registered destination: <strong>{otpHint}</strong>.
                </p>
              </div>

              <div>
                <label className="form-label" htmlFor="cb-otp">Enter One-Time Password (OTP)</label>
                <input
                  id="cb-otp"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 123456"
                  value={cbOtpText}
                  onChange={e => setCbOtpText(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setOtpRequired(false)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={connecting}
                >
                  {connecting ? 'Verifying OTP…' : 'Complete Verification'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ── MODAL: SUBJECT DETAILED REGISTER ─────────────────── */}
      <Modal
        isOpen={Boolean(selectedSubject)}
        onClose={() => { setSelectedSubject(null); setRegisterData(null); }}
        title={selectedSubject ? `${selectedSubject.name} — Attendance Register` : 'Register'}
        maxWidth={720}
      >
        {selectedSubject && (
          <div>
            {/* Subject Summary Bar */}
            <div className="attendly-register-header-summary">
              <div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>Subject Code</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)' }}>{selectedSubject.code}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>Current Rate</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: selectedSubject.colorHex }}>{selectedSubject.attendancePercentage}%</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>Attended / Total</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{selectedSubject.attendedClasses} / {selectedSubject.totalClasses}</div>
              </div>
              <div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>Classes Missed</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: selectedSubject.missedClasses > 0 ? 'var(--danger)' : 'inherit' }}>{selectedSubject.missedClasses}</div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="attendly-filter-tabs">
              {[
                { id: 'ALL', label: `All Sessions (${registerData?.sessions?.length || 0})` },
                { id: 'PRESENT', label: `Present (${registerData?.sessions?.filter(s => s.status === 'PRESENT').length || 0})` },
                { id: 'ABSENT', label: `Absent (${registerData?.sessions?.filter(s => s.status === 'ABSENT').length || 0})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`attendly-filter-tab${registerFilter === tab.id ? ' active' : ''}`}
                  onClick={() => setRegisterFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Session List */}
            {loadingRegister ? (
              <LoadingState message="Loading subject register sessions…" />
            ) : filteredSessions.length === 0 ? (
              <EmptyState
                icon={<Calendar size={22} />}
                title="No Sessions Recorded"
                description="No matching lecture records exist for this filter."
              />
            ) : (
              <div className="attendly-register-list">
                {filteredSessions.map(session => (
                  <div key={session._id} className="attendly-register-item">
                    <div>
                      <div className="attendly-register-date">
                        {formatDate(session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                        {session.period && (
                          <span className="attendly-register-period">
                            {session.period}
                          </span>
                        )}
                        {session.topic && (
                          <span className="attendly-register-topic">
                            • {session.topic}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: 'var(--font-mono)',
                            color: session.source === 'CODE_BRIGADE' ? 'var(--success)' : 'var(--fg-faint)',
                            textTransform: 'uppercase',
                          }}
                        >
                          [{session.source || 'MANUAL'}]
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 8px',
                          background: session.status === 'PRESENT' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: session.status === 'PRESENT' ? 'var(--success)' : 'var(--danger)',
                          border: `1px solid ${session.status === 'PRESENT' ? 'var(--success)' : 'var(--danger)'}`,
                        }}
                      >
                        {session.status}
                      </span>

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 10, padding: '3px 8px', color: 'var(--fg-secondary)' }}
                        onClick={() => handleToggleSessionStatus(session._id, session.status)}
                        title="Correct this session record"
                      >
                        Switch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── MODAL: QUICK MARK CLASS ATTENDANCE ──────────────── */}
      <Modal
        isOpen={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        title="Mark Class Attendance"
        maxWidth={480}
      >
        <form onSubmit={handleQuickMarkSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            <div>
              <label className="form-label" htmlFor="mark-subject">Subject</label>
              <select
                id="mark-subject"
                className="form-input"
                value={markSubjectId}
                onChange={e => setMarkSubjectId(e.target.value)}
                required
              >
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="mark-date">Date</label>
              <input
                id="mark-date"
                type="date"
                className="form-input"
                value={markDate}
                onChange={e => setMarkDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="mark-period">Lecture Slot / Period</label>
              <input
                id="mark-period"
                type="text"
                className="form-input"
                placeholder="e.g. Lecture 1 (09:00 - 10:00 AM)"
                value={markPeriod}
                onChange={e => setMarkPeriod(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="mark-topic">Topic Covered (Optional)</label>
              <input
                id="mark-topic"
                type="text"
                className="form-input"
                placeholder="e.g. Dynamic Programming Memoization"
                value={markTopic}
                onChange={e => setMarkTopic(e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: markStatus === 'PRESENT' ? 'var(--success)' : 'var(--bg-elevated)',
                    color: markStatus === 'PRESENT' ? '#0A0A0A' : 'var(--fg-secondary)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                  }}
                  onClick={() => setMarkStatus('PRESENT')}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Present (+1 Attended)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: markStatus === 'ABSENT' ? 'var(--danger)' : 'var(--bg-elevated)',
                    color: markStatus === 'ABSENT' ? '#FAFAFA' : 'var(--fg-secondary)',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                  }}
                  onClick={() => setMarkStatus('ABSENT')}
                >
                  <XCircle size={14} aria-hidden="true" />
                  Absent (+1 Missed)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMarkModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submittingMark}
              >
                {submittingMark ? 'Saving…' : 'Record Session'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: SOURCE NOTICE & CODE BRIGADE STATUS ──────── */}
      <Modal
        isOpen={sourceNoticeOpen}
        onClose={() => setSourceNoticeOpen(false)}
        title="Attendance Data Integrity & Integration Status"
        maxWidth={540}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)', fontSize: 13, lineHeight: 1.6, color: 'var(--fg-secondary)' }}>
          <p>
            <strong>Active Provider:</strong> {dataSource.providerLabel}
          </p>

          <div style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 12 }}>
            <div style={{ color: 'var(--fg-primary)', fontWeight: 700, marginBottom: 4 }}>
              University Portal Architecture:
            </div>
            {dataSource.notice}
            {dataSource.lastSyncedAt && (
              <div style={{ marginTop: 6, color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)' }}>
                Latest Synchronized: {formatDate(dataSource.lastSyncedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSourceNoticeOpen(false)}
            >
              Close
            </button>
            {dataSource.isConnected ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setSourceNoticeOpen(false); handleSyncAttendance(); }}
                disabled={syncing}
              >
                Synchronize Now
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setSourceNoticeOpen(false); setConnectModalOpen(true); }}
              >
                Connect Code Brigade
              </button>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
