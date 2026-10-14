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
  GraduationCap,
  FileText,
  Check,
  ExternalLink,
  ChevronDown,
  ClipboardList
} from 'lucide-react';
import { attendanceAPI, subjectsAPI, recordsAPI } from '../services/api';
import { Modal, LoadingState, ErrorState, EmptyState } from '../components/SharedComponents';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';

export default function AcademicRecordsPage({ initialTab = 'attendance' }) {
  const { toast } = useToast();

  // Active Tab State: 'attendance' | 'report-card'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'report-card' || tabParam === 'reportcard' || tabParam === 'grades') {
      return 'report-card';
    }
    return initialTab;
  });

  // Sync tab with URL search parameter smoothly
  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab);
    const url = new URL(window.location);
    if (newTab === 'report-card') {
      url.searchParams.set('tab', 'report-card');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));

    if (newTab === 'report-card' && !reportCardData && !loadingReportCard) {
      fetchReportCard();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. ATTENDANCE CORE STATE (100% PRESERVED FROM ATTENDANCE PAGE)
  // ─────────────────────────────────────────────────────────────
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

  // Connect Code Brigade Modal State (Shared across Attendance and Report Card)
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

  // ─────────────────────────────────────────────────────────────
  // 2. REPORT CARD CORE STATE (OFFICIAL UNIVERSITY RESULTS)
  // ─────────────────────────────────────────────────────────────
  const [reportCardData, setReportCardData] = useState(null);
  const [loadingReportCard, setLoadingReportCard] = useState(false);
  const [syncingReportCard, setSyncingReportCard] = useState(false);
  const [reportCardError, setReportCardError] = useState('');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('ALL');

  // Fetch Attendance Dashboard Summary
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

  // Fetch Report Card from Server / University
  const fetchReportCard = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingReportCard(true);
    setReportCardError('');
    try {
      const res = await attendanceAPI.getReportCard();
      if (res.data) {
        setReportCardData(res.data);
      }
    } catch (err) {
      setReportCardError(err.message || 'Failed to retrieve university examination report card.');
    } finally {
      if (!isSilent) setLoadingReportCard(false);
      setSyncingReportCard(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(threshold);
  }, [fetchSummary, threshold]);

  useEffect(() => {
    if (activeTab === 'report-card') {
      fetchReportCard();
    }
  }, [activeTab, fetchReportCard]);

  // Handle Manual Refresh for Attendance
  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (dashboardData?.dataSource?.isConnected) {
      handleSyncAttendance();
    } else {
      fetchSummary(threshold, true);
      toast.info('Refreshed local attendance records.');
    }
  };

  // Trigger live synchronization of Attendance with Code Brigade
  const handleSyncAttendance = async () => {
    setSyncing(true);
    toast.info('Connecting to Code Brigade to synchronize attendance…');
    try {
      const res = await attendanceAPI.syncAttendance();
      if (res.data) setDashboardData(res.data);
      toast.success('Live attendance synchronized with Code Brigade!');
    } catch (err) {
      if (err.data) setDashboardData(err.data);
      toast.error(err.message || 'Failed to sync with university server. Showing last valid records.');
    } finally {
      setSyncing(false);
      setRefreshing(false);
    }
  };

  // Trigger live synchronization of Report Card with Code Brigade
  const handleSyncReportCard = async () => {
    setSyncingReportCard(true);
    toast.info('Connecting to university portal to fetch official grade card…');
    try {
      const res = await attendanceAPI.syncReportCard();
      if (res.data) {
        setReportCardData(res.data);
      }
      toast.success('Official university examination grade card synchronized!');
    } catch (err) {
      toast.error(err.message || 'Failed to synchronize report card with university portal.');
    } finally {
      setSyncingReportCard(false);
    }
  };

  // Connect Code Brigade credentials (serves both Attendance and Report Card)
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
        toast.warning(res.message || 'Connected, but university synchronization is pending.');
      }

      if (res.data) setDashboardData(res.data);
      setConnectModalOpen(false);
      setCbPassword('');
      setOtpRequired(false);

      // Refresh both attendance and report card
      fetchSummary(threshold, true);
      fetchReportCard(true);
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
        toast.warning(res.message || 'OTP verified, university session activated.');
      }

      if (res.data) setDashboardData(res.data);
      setConnectModalOpen(false);
      setOtpRequired(false);
      setCbOtpText('');
      setCbPassword('');

      fetchSummary(threshold, true);
      fetchReportCard(true);
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
      setReportCardData(null);
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

  // Open Detailed Register Modal for a Subject
  const handleOpenRegister = async (subj) => {
    setSelectedSubject(subj);
    setLoadingRegister(true);
    setRegisterFilter('ALL');
    try {
      const res = await attendanceAPI.getSubjectRegister(subj._id);
      if (res.data) {
        setRegisterData(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Could not load lecture register for this subject.');
    } finally {
      setLoadingRegister(false);
    }
  };

  // Quick mark attendance submission
  const handleQuickMarkSubmit = async (e) => {
    e.preventDefault();
    if (!markSubjectId) {
      toast.error('Please select a subject to mark attendance.');
      return;
    }
    setSubmittingMark(true);
    try {
      const payload = {
        subjectId: markSubjectId,
        date: markDate,
        status: markStatus,
        period: markPeriod,
        topic: markTopic.trim() || undefined,
      };
      await attendanceAPI.quickMark(payload);
      toast.success(`Marked as ${markStatus} for ${markDate}`);
      setMarkModalOpen(false);
      setMarkTopic('');
      fetchSummary(threshold, true);
      if (selectedSubject && selectedSubject._id === markSubjectId) {
        handleOpenRegister(selectedSubject);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to record attendance session.');
    } finally {
      setSubmittingMark(false);
    }
  };

  // Toggle sample evaluation dataset
  const handleToggleSampleData = async (action) => {
    setTogglingSample(true);
    try {
      const res = await attendanceAPI.toggleSampleData(action);
      toast.success(res.message);
      if (res.data) setDashboardData(res.data);
      setSourceNoticeOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update sample dataset.');
    } finally {
      setTogglingSample(false);
    }
  };

  // Filtered Register Sessions
  const filteredSessions = useMemo(() => {
    if (!registerData?.sessions) return [];
    if (registerFilter === 'ALL') return registerData.sessions;
    return registerData.sessions.filter(s => s.status === registerFilter);
  }, [registerData, registerFilter]);

  // Derived Attendance Data
  const subjects = dashboardData?.subjects || [];
  const overall = dashboardData?.overall || {
    percentage: 0,
    totalConducted: 0,
    totalAttended: 0,
    totalMissed: 0,
    threshold: 75,
    standing: {
      status: 'NO_DATA',
      label: 'No Classes Recorded',
      badgeClass: 'badge-neutral',
      color: 'var(--fg-faint)',
      isShortage: false,
    },
    recovery: { required: 0, isMet: true, impossible: false, message: 'No classes recorded yet.' },
    canMiss: { canMiss: 0, isMet: true, message: 'No attendance buffer available.' },
  };
  const insights = dashboardData?.insights || [];
  const shortfalls = dashboardData?.shortfallRankings || [];
  const dataSource = dashboardData?.dataSource || {
    isConnected: false,
    provider: 'CAMPUSFLOW_LOCAL',
    providerLabel: 'Local Manual Records',
    badgeClass: 'badge-neutral',
  };

  // Calculator computations
  const calcSubject = useMemo(() => {
    if (calcSubjectId === 'OVERALL') {
      const conducted = customConducted !== '' ? Number(customConducted) : overall.totalConducted;
      const attended = customAttended !== '' ? Number(customAttended) : overall.totalAttended;
      return {
        name: 'Overall Aggregate',
        totalClasses: conducted,
        attendedClasses: attended,
        percentage: conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0,
      };
    }
    const found = subjects.find(s => s._id === calcSubjectId);
    if (!found) return { name: 'Unknown', totalClasses: 0, attendedClasses: 0, percentage: 0 };
    const conducted = customConducted !== '' ? Number(customConducted) : found.totalClasses;
    const attended = customAttended !== '' ? Number(customAttended) : found.attendedClasses;
    return {
      name: found.name,
      totalClasses: conducted,
      attendedClasses: attended,
      percentage: conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0,
    };
  }, [calcSubjectId, customConducted, customAttended, overall, subjects]);

  const calcResults = useMemo(() => {
    const a = Math.max(0, calcSubject.attendedClasses);
    const c = Math.max(0, calcSubject.totalClasses);
    const t = Math.min(100, Math.max(1, calcTarget)) / 100;
    const currentPct = c > 0 ? Math.round((a / c) * 1000) / 10 : 0;

    let classesToAttend = 0;
    let classesCanMiss = 0;
    let impossible = false;

    if (t >= 1) {
      if (a < c) impossible = true;
      classesToAttend = 0;
      classesCanMiss = 0;
    } else {
      const numerator = t * c - a;
      if (numerator > 0) {
        classesToAttend = Math.ceil(numerator / (1 - t));
      }
      const missNumerator = a - t * c;
      if (missNumerator > 0) {
        classesCanMiss = Math.floor(missNumerator / t);
      }
    }

    return {
      currentPct,
      classesToAttend,
      classesCanMiss,
      impossible,
      isTargetMet: currentPct >= calcTarget,
    };
  }, [calcSubject, calcTarget]);

  // Circular gauge SVG calculations
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (overall.percentage / 100) * circumference;

  // Grade color helper for Report Card
  const getGradeStyle = (grade = '') => {
    const g = String(grade).toUpperCase().trim();
    if (g === 'O') {
      return { bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', border: 'rgba(139, 92, 246, 0.35)', label: 'Outstanding' };
    }
    if (g === 'A+' || g === 'A') {
      return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: 'rgba(16, 185, 129, 0.35)', label: 'Excellent' };
    }
    if (g === 'B+' || g === 'B') {
      return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: 'rgba(59, 130, 246, 0.35)', label: 'Very Good' };
    }
    if (g === 'C' || g === 'P') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', border: 'rgba(245, 158, 11, 0.35)', label: 'Pass' };
    }
    if (g === 'F') {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: 'rgba(239, 68, 68, 0.35)', label: 'Fail' };
    }
    return { bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--fg-secondary)', border: 'var(--border)', label: g || 'N/A' };
  };

  // Filtered Semesters for Report Card
  const record = reportCardData?.record;
  const rcDataSource = reportCardData?.dataSource || { isConnected: false };
  const semestersList = useMemo(() => {
    if (!record?.semesters) return [];
    if (selectedSemesterFilter === 'ALL') return record.semesters;
    return record.semesters.filter(s => s.semester === selectedSemesterFilter);
  }, [record, selectedSemesterFilter]);

  return (
    <div className="attendly-dashboard">
      {/* ─────────────────────────────────────────────────────────────
          UNIFIED ACADEMIC RECORDS NAVIGATION BAR
      ───────────────────────────────────────────────────────────── */}
      <div className="academic-records-topbar">
        <div className="academic-records-header-text">
          <div className="attendly-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GraduationCap size={13} className="text-accent" aria-hidden="true" />
            <span>ACADEMIC INTELLIGENCE SUITE</span>
          </div>
          <h1 className="academic-records-main-title">Academic Records</h1>
          <p className="academic-records-subtitle">
            Unified student records for attendance tracking, lecture registers, and official university grade sheets.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="academic-records-tab-pills" role="tablist" aria-label="Academic Records Navigation">
          <button
            className={`academic-pill-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('attendance')}
            role="tab"
            aria-selected={activeTab === 'attendance'}
            id="tab-btn-attendance"
          >
            <ClipboardList size={14} aria-hidden="true" />
            <span>Attendance</span>
            {overall.totalConducted > 0 && (
              <span className="academic-tab-badge">{overall.percentage}%</span>
            )}
          </button>

          <button
            className={`academic-pill-btn ${activeTab === 'report-card' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('report-card')}
            role="tab"
            aria-selected={activeTab === 'report-card'}
            id="tab-btn-report-card"
          >
            <GraduationCap size={14} aria-hidden="true" />
            <span>Report Card</span>
            {record?.summary?.latestCgpa ? (
              <span className="academic-tab-badge">CGPA {record.summary.latestCgpa}</span>
            ) : null}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ATTENDANCE SECTION (100% PRESERVED FUNCTIONALITY)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <>
          {/* Attendance Action Header */}
          <div className="attendly-header" style={{ marginTop: 'var(--s4)' }}>
            <div>
              <div className="attendly-kicker">
                <span>ATTENDANCE INTELLIGENCE</span>
                {dataSource.isConnected && (
                  <span className="attendly-live-pulse-dot" title="Connected to Code Brigade" />
                )}
              </div>
              <h2 className="attendly-title" style={{ fontSize: 22 }}>Attendance & Registers</h2>
              <div className="attendly-subtitle">
                {dataSource.isConnected && dataSource.studentName
                  ? `Authenticated as ${dataSource.studentName} (${dataSource.rollNumber || dataSource.className || 'CUIET'})`
                  : 'Track class attendance, lecture registers, and bunk safety margins.'}
              </div>
            </div>

            <div className="attendly-header-actions">
              {/* Data Source Badge */}
              <button
                type="button"
                className={`attendly-source-badge ${dataSource.badgeClass || 'badge-neutral'}`}
                onClick={() => setSourceNoticeOpen(true)}
                title="Click to view university data origin and synchronization rules"
              >
                <Database size={11} aria-hidden="true" />
                <span>
                  {dataSource.isConnected
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

              {/* Manual Refresh */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                title="Refresh attendance records"
                id="btn-refresh-attendance"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading academic attendance intelligence…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchSummary(threshold)} />
          ) : (
            <>
              {/* 1. HERO AGGREGATE CARD (Circular Gauge & Stat Metrics) */}
              <div className="attendly-hero-grid">
                {/* Circular Percentage */}
                <div className="attendly-circle-container">
                  <div className="attendly-circle-svg-wrapper">
                    <svg width={radius * 2} height={radius * 2}>
                      <circle
                        stroke="var(--bg-elevated)"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                      />
                      <circle
                        stroke={overall.standing.color || 'var(--accent)'}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease' }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                      />
                    </svg>

                    <div className="attendly-circle-center-text">
                      <div className="attendly-circle-pct">{overall.percentage}%</div>
                      <div className="attendly-circle-label">Aggregate Attendance</div>
                    </div>
                  </div>

                  <div className="attendly-hero-badge-wrap">
                    <span className={`badge ${overall.standing.badgeClass}`}>
                      {overall.standing.label}
                    </span>
                  </div>
                </div>

                {/* Stat Metrics & Quick Safety Calculation */}
                <div className="attendly-hero-details">
                  <div className="attendly-stats-row">
                    <div className="attendly-stat-box">
                      <div className="attendly-stat-title">Classes Attended</div>
                      <div className="attendly-stat-value text-success">{overall.totalAttended}</div>
                      <div className="attendly-stat-hint">Delivered lectures present</div>
                    </div>

                    <div className="attendly-stat-box">
                      <div className="attendly-stat-title">Total Conducted</div>
                      <div className="attendly-stat-value">{overall.totalConducted}</div>
                      <div className="attendly-stat-hint">Across {subjects.length} active courses</div>
                    </div>

                    <div className="attendly-stat-box">
                      <div className="attendly-stat-title">Classes Missed</div>
                      <div className="attendly-stat-value text-danger">{overall.totalMissed}</div>
                      <div className="attendly-stat-hint">Absences recorded</div>
                    </div>
                  </div>

                  {/* Dynamic Threshold & Action Advice */}
                  <div className="attendly-threshold-control">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="attendly-stat-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sliders size={13} aria-hidden="true" />
                        Target Threshold: <strong>{threshold}%</strong>
                      </span>
                      <div className="attendly-threshold-pills">
                        {[75, 80, 85].map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`attendly-pill-btn ${threshold === t ? 'active' : ''}`}
                            onClick={() => handleThresholdChange(t)}
                          >
                            {t}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actionable Recovery Advice */}
                    <div className="attendly-recovery-banner">
                      {overall.totalConducted === 0 ? (
                        <div className="attendly-recovery-text text-neutral">
                          <Info size={14} aria-hidden="true" />
                          <span>No class sessions registered yet. Mark classes or connect Code Brigade to track attendance.</span>
                        </div>
                      ) : overall.percentage < threshold ? (
                        <div className="attendly-recovery-text text-danger">
                          <AlertTriangle size={15} aria-hidden="true" />
                          <span>
                            <strong>Attendance Shortfall:</strong> {overall.recovery.message}
                          </span>
                        </div>
                      ) : (
                        <div className="attendly-recovery-text text-success">
                          <CheckCircle2 size={15} aria-hidden="true" />
                          <span>
                            <strong>Safety Margin:</strong> {overall.canMiss.message}
                          </span>
                        </div>
                      )}

                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setCalcSubjectId('OVERALL');
                          setCalcTarget(threshold);
                          const el = document.getElementById('attendance-calculator-section');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Calculator size={12} aria-hidden="true" />
                        Open Bunk Simulator
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SUBJECT-WISE ATTENDANCE GRID */}
              <div className="attendly-subjects-header">
                <div>
                  <h3 className="attendly-section-title">Enrolled Course Attendance</h3>
                  <p className="attendly-section-subtitle">
                    Official delivered, attended, and missed counts per course. Click "View Register" for lecture breakdown.
                  </p>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                  {subjects.length} Subjects Monitored
                </div>
              </div>

              {subjects.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No subjects found"
                  message="No courses are currently being tracked. Connect your Code Brigade account to automatically synchronize subjects and attendance."
                  actionLabel="Connect Code Brigade"
                  onAction={() => setConnectModalOpen(true)}
                />
              ) : (
                <div className="attendly-subjects-grid">
                  {subjects.map(subj => {
                    const subjPct = subj.attendancePercentage;
                    const isShort = subjPct < threshold;
                    return (
                      <div key={subj._id} className="attendly-subject-card">
                        <div className="attendly-card-header">
                          <div>
                            <div className="attendly-subject-name" title={subj.name}>
                              {subj.name}
                            </div>
                            <div className="attendly-subject-meta">
                              <span className="attendly-code-badge">{subj.code || 'NO-CODE'}</span>
                              {subj.teacher && <span>• {subj.teacher}</span>}
                              {subj.source === 'CODE_BRIGADE' && (
                                <span className="attendly-tag-cb">Code Brigade</span>
                              )}
                            </div>
                          </div>
                          <div className={`attendly-subject-pct-badge ${subj.badgeClass}`}>
                            {subjPct}%
                          </div>
                        </div>

                        {/* Progress Bar with Threshold Marker */}
                        <div className="attendly-progress-wrapper">
                          <div className="attendly-progress-track">
                            <div
                              className="attendly-progress-fill"
                              style={{
                                width: `${Math.min(100, subjPct)}%`,
                                background: subj.colorHex || 'var(--accent)',
                              }}
                            />
                            {/* Visual Threshold Marker */}
                            <div
                              className="attendly-threshold-indicator"
                              style={{ left: `${threshold}%` }}
                              title={`Target Threshold: ${threshold}%`}
                            />
                          </div>
                        </div>

                        {/* Stats Matrix */}
                        <div className="attendly-metrics-row">
                          <div className="attendly-metric-item">
                            <span>Attended</span>
                            <span className="text-success">{subj.attendedClasses}</span>
                          </div>
                          <div className="attendly-metric-item">
                            <span>Conducted</span>
                            <span>{subj.totalClasses}</span>
                          </div>
                          <div className="attendly-metric-item">
                            <span>Missed</span>
                            <span className={subj.missedClasses > 0 ? 'text-danger' : 'text-neutral'}>
                              {subj.missedClasses}
                            </span>
                          </div>
                          {subj.dutyLeave > 0 && (
                            <div className="attendly-metric-item">
                              <span>DL</span>
                              <span>{subj.dutyLeave}</span>
                            </div>
                          )}
                        </div>

                        {/* Status Message & Action Advice */}
                        <div className="attendly-subject-status-text">
                          {subj.totalClasses === 0 ? (
                            <span className="text-muted">No lectures delivered yet</span>
                          ) : isShort ? (
                            <span className="text-danger">
                              Attend next <strong>{subj.classesNeededForThreshold}</strong> classes to reach {threshold}%
                            </span>
                          ) : (
                            <span className="text-success">
                              Can safely miss <strong>{subj.classesCanMiss}</strong> classes
                            </span>
                          )}
                        </div>

                        {/* Register Action Button */}
                        <div className="attendly-card-footer">
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs btn-block"
                            onClick={() => handleOpenRegister(subj)}
                            id={`btn-register-${subj._id}`}
                          >
                            <Calendar size={12} aria-hidden="true" />
                            View Register
                            <ChevronRight size={12} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. SIMULATOR & BUNK CALCULATOR SECTION */}
              <div id="attendance-calculator-section" className="attendly-calc-container">
                <div className="attendly-calc-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="attendly-calc-icon">
                      <Calculator size={18} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Attendance Bunk & Recovery Simulator</h3>
                      <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: 0 }}>
                        Calculate how many consecutive classes you must attend to recover, or how many you can safely miss.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="attendly-calc-body">
                  <div className="attendly-calc-inputs">
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Subject Scope</label>
                      <select
                        className="form-control"
                        value={calcSubjectId}
                        onChange={(e) => {
                          setCalcSubjectId(e.target.value);
                          setCustomAttended('');
                          setCustomConducted('');
                        }}
                      >
                        <option value="OVERALL">Aggregate Overall Attendance</option>
                        {subjects.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.code || 'Course'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Classes Attended</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder={String(calcSubject.attendedClasses)}
                          value={customAttended}
                          onChange={(e) => setCustomAttended(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Classes Conducted</label>
                        <input
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder={String(calcSubject.totalClasses)}
                          value={customConducted}
                          onChange={(e) => setCustomConducted(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: 8 }}>
                      <label className="form-label">Target Percentage: {calcTarget}%</label>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="1"
                        className="form-range"
                        value={calcTarget}
                        onChange={(e) => setCalcTarget(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  </div>

                  {/* Calculator Simulation Output */}
                  <div className="attendly-calc-results">
                    <div className="attendly-calc-curr-pct">
                      <span style={{ fontSize: 11, color: 'var(--fg-secondary)', textTransform: 'uppercase' }}>
                        Current Standing
                      </span>
                      <span className="attendly-calc-pct-num">{calcResults.currentPct}%</span>
                    </div>

                    <div className="attendly-calc-answer-box">
                      {calcResults.impossible ? (
                        <div className="text-danger" style={{ fontSize: 13 }}>
                          <strong>Target 100% Unreachable:</strong> Because classes have already been missed, 100% cannot be achieved.
                        </div>
                      ) : calcResults.isTargetMet ? (
                        <div>
                          <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14 }}>
                            Target Met! Safe to miss:
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-primary)', margin: '4px 0' }}>
                            {calcResults.classesCanMiss} Classes
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                            You can safely miss up to {calcResults.classesCanMiss} consecutive lectures while maintaining {calcTarget}%.
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 14 }}>
                            Shortfall! Required to attend:
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-primary)', margin: '4px 0' }}>
                            {calcResults.classesToAttend} Classes
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                            Attend the next {calcResults.classesToAttend} consecutive lectures without absence to reach {calcTarget}%.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: REPORT CARD / EXAMINATION GRADE CARD
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'report-card' && (
        <div className="report-card-section" style={{ marginTop: 'var(--s4)' }}>
          {/* Header & Synchronization Controls */}
          <div className="attendly-header">
            <div>
              <div className="attendly-kicker">
                <span>OFFICIAL EXAMINATION RECORDS</span>
                {rcDataSource.isConnected && (
                  <span className="attendly-live-pulse-dot" title="Authorized University Session Active" />
                )}
              </div>
              <h2 className="attendly-title" style={{ fontSize: 22 }}>Grade Card & Examination Results</h2>
              <div className="attendly-subtitle">
                {record?.studentName
                  ? `Official Chitkara University Grade Card for ${record.studentName} (${record.rollNumber || 'Student ID: ' + rcDataSource.studentName})`
                  : 'Official semester-wise grade sheets, course credits, SGPA, and cumulative CGPA.'}
              </div>
            </div>

            <div className="attendly-header-actions">
              {/* Data Source Badge */}
              <button
                type="button"
                className={`attendly-source-badge ${rcDataSource.isConnected ? 'badge-success' : 'badge-neutral'}`}
                onClick={() => setSourceNoticeOpen(true)}
                title="View university synchronization status"
              >
                <Database size={11} aria-hidden="true" />
                <span>
                  {rcDataSource.isConnected
                    ? 'Chitkara University Live'
                    : 'Not Connected'}
                </span>
              </button>

              {/* Sync Report Card Button */}
              {rcDataSource.isConnected ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSyncReportCard}
                  disabled={syncingReportCard}
                  id="btn-sync-report-card"
                  title="Synchronize fresh official grade card from university portal"
                >
                  <RefreshCw size={13} className={syncingReportCard ? 'animate-spin' : ''} aria-hidden="true" />
                  {syncingReportCard ? 'Synchronizing…' : 'Sync Report Card'}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setConnectModalOpen(true)}
                  id="btn-connect-codebrigade-rc"
                >
                  <Link2 size={13} aria-hidden="true" />
                  Connect Code Brigade
                </button>
              )}

              {/* Manual Refresh */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fetchReportCard()}
                disabled={loadingReportCard}
                title="Refresh grade card"
                id="btn-refresh-report-card"
              >
                <RefreshCw size={13} className={loadingReportCard ? 'animate-spin' : ''} aria-hidden="true" />
              </button>
            </div>
          </div>

          {loadingReportCard ? (
            <LoadingState message="Retrieving official university examination records…" />
          ) : reportCardError ? (
            <ErrorState message={reportCardError} onRetry={() => fetchReportCard()} />
          ) : !rcDataSource.isConnected && !record ? (
            /* Unconnected State: Prompt to connect university account */
            <div className="report-card-prompt-card">
              <div className="report-card-prompt-icon">
                <GraduationCap size={32} />
              </div>
              <h3 className="report-card-prompt-title">Connect University Account to Import Report Card</h3>
              <p className="report-card-prompt-text">
                CampusFlow AI connects securely to your university student portal (cuiet.codebrigade.in) using your authorized credentials to retrieve your official semester results, SGPA, CGPA, and course credits.
              </p>
              <div className="report-card-prompt-features">
                <div className="report-card-feature-item">
                  <Check size={14} className="text-success" />
                  <span>Semester-by-semester SGPA & CGPA progression</span>
                </div>
                <div className="report-card-feature-item">
                  <Check size={14} className="text-success" />
                  <span>Official course codes, titles, and credit weightages</span>
                </div>
                <div className="report-card-feature-item">
                  <Check size={14} className="text-success" />
                  <span>Verified letter grades (O, A+, A, B+, B, C, P, F)</span>
                </div>
                <div className="report-card-feature-item">
                  <Check size={14} className="text-success" />
                  <span>Zero password storage — server-side session authentication</span>
                </div>
              </div>
              <button
                className="btn btn-primary btn-md"
                onClick={() => setConnectModalOpen(true)}
                id="btn-prompt-connect-cb"
              >
                <Link2 size={14} />
                Connect Code Brigade Account
              </button>
            </div>
          ) : record?.semesters?.length === 0 ? (
            /* Connected but No Records Published Yet */
            <div className="report-card-empty-state">
              <div className="report-card-empty-icon">
                <FileText size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 6px 0' }}>
                No Official Examination Results Declared Yet
              </h3>
              <p style={{ fontSize: 13, color: 'var(--fg-secondary)', maxWidth: 500, margin: '0 auto 16px auto', lineHeight: 1.6 }}>
                The university examination branch has not published an official grade card or report card for your enrolled session yet. Check back once examination results are officially declared.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSyncReportCard}
                disabled={syncingReportCard}
              >
                <RefreshCw size={13} className={syncingReportCard ? 'animate-spin' : ''} />
                Check University Portal Again
              </button>
            </div>
          ) : (
            /* Verified Official Grade Card Results */
            <>
              {/* 1. Academic Performance Hero Banner */}
              <div className="report-card-hero-grid">
                {/* CGPA Card */}
                <div className="report-card-hero-card hero-cgpa">
                  <div className="report-card-hero-label">Cumulative Grade Point Average</div>
                  <div className="report-card-hero-num">{record.summary?.latestCgpa ?? 'N/A'}</div>
                  <div className="report-card-hero-meta">
                    <span className="badge badge-success">
                      <Award size={11} /> Verified University Record
                    </span>
                  </div>
                </div>

                {/* Latest SGPA Card */}
                <div className="report-card-hero-card">
                  <div className="report-card-hero-label">Latest Semester SGPA</div>
                  <div className="report-card-hero-num text-accent">
                    {record.summary?.latestSgpa ?? (record.semesters?.[record.semesters.length - 1]?.sgpa ?? 'N/A')}
                  </div>
                  <div className="report-card-hero-meta">
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {record.semesters?.[record.semesters.length - 1]?.semester || 'Latest Term'}
                    </span>
                  </div>
                </div>

                {/* Total Credits Earned */}
                <div className="report-card-hero-card">
                  <div className="report-card-hero-label">Total Credits Earned</div>
                  <div className="report-card-hero-num">{record.summary?.totalCreditsEarned ?? 0}</div>
                  <div className="report-card-hero-meta">
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Across {record.summary?.totalSemesters ?? record.semesters.length} Completed Terms
                    </span>
                  </div>
                </div>

                {/* Verified Identity Card */}
                <div className="report-card-hero-card hero-identity">
                  <div className="report-card-hero-label">Official University Registry</div>
                  <div className="report-card-student-name">{record.studentName || 'Student'}</div>
                  <div className="report-card-identity-pills">
                    <span className="identity-pill">Roll: <strong>{record.rollNumber || '—'}</strong></span>
                    <span className="identity-pill">Class: <strong>{record.className || '—'}</strong></span>
                  </div>
                  {record.lastSyncedAt && (
                    <div className="report-card-sync-time">
                      Synced {formatDate(record.lastSyncedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Semester Filter Selector */}
              <div className="report-card-filter-row">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-secondary)' }}>
                  View Semester:
                </div>
                <div className="report-card-filter-pills">
                  <button
                    type="button"
                    className={`report-filter-btn ${selectedSemesterFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setSelectedSemesterFilter('ALL')}
                  >
                    All Terms ({record.semesters.length})
                  </button>
                  {record.semesters.map(s => (
                    <button
                      key={s.semester}
                      type="button"
                      className={`report-filter-btn ${selectedSemesterFilter === s.semester ? 'active' : ''}`}
                      onClick={() => setSelectedSemesterFilter(s.semester)}
                    >
                      {s.semester}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Semester Breakdown Cards */}
              <div className="report-card-semesters-list">
                {semestersList.map((sem, sIdx) => (
                  <div key={sem.semester || sIdx} className="report-card-semester-box">
                    <div className="semester-box-header">
                      <div className="semester-box-title">
                        <GraduationCap size={16} className="text-accent" />
                        <span>Study Period: {sem.semester}</span>
                      </div>
                      <div className="semester-box-metrics">
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">SGPA</span>
                          <span className="sem-metric-val">{sem.sgpa ?? '—'}</span>
                        </div>
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">CGPA</span>
                          <span className="sem-metric-val">{sem.cgpa ?? '—'}</span>
                        </div>
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">Credits</span>
                          <span className="sem-metric-val">{sem.totalCredits}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="table-responsive" style={{ margin: 0 }}>
                      <table className="report-card-table" aria-label={`Examination results for ${sem.semester}`}>
                        <thead>
                          <tr>
                            <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                            <th style={{ width: '16%' }}>Course Code</th>
                            <th style={{ width: '45%' }}>Course Title</th>
                            <th style={{ width: '10%', textAlign: 'center' }}>Credits</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Grade</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sem.subjects.map((subj, cIdx) => {
                            const gradeStyle = getGradeStyle(subj.grade);
                            return (
                              <tr key={subj.code || cIdx}>
                                <td style={{ textAlign: 'center', color: 'var(--fg-faint)', fontSize: 12 }}>
                                  {subj.sNo || cIdx + 1}
                                </td>
                                <td>
                                  <span className="report-code-badge">{subj.code}</span>
                                </td>
                                <td>
                                  <div className="report-course-name">{subj.name}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                  {Number(subj.credits).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span
                                    className="report-grade-badge"
                                    style={{
                                      background: gradeStyle.bg,
                                      color: gradeStyle.color,
                                      border: `1px solid ${gradeStyle.border}`,
                                    }}
                                    title={gradeStyle.label}
                                  >
                                    {subj.grade}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span
                                    className={`badge ${subj.status === 'PASS' ? 'badge-success' : 'badge-danger'}`}
                                    style={{ fontSize: 11, padding: '2px 8px' }}
                                  >
                                    {subj.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. University Evaluation Notes Card */}
              {record.officialNotes && record.officialNotes.length > 0 && (
                <div className="university-notes-card">
                  <div className="university-notes-header">
                    <Info size={15} className="text-accent" />
                    <span>University Examination Branch Evaluation Terms</span>
                  </div>
                  <ul className="university-notes-list">
                    {record.officialNotes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SHARED MODAL 1: SUBJECT ATTENDANCE REGISTER
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedSubject)}
        onClose={() => {
          setSelectedSubject(null);
          setRegisterData(null);
        }}
        title={`Attendance Register — ${selectedSubject?.name || 'Subject'}`}
        subtitle={`${selectedSubject?.code || ''} • Total Conducted: ${selectedSubject?.totalClasses || 0} • Attended: ${selectedSubject?.attendedClasses || 0}`}
        maxWidth={760}
      >
        <div className="register-modal-content">
          <div className="register-filter-bar">
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'PRESENT', 'ABSENT'].map(f => (
                <button
                  key={f}
                  type="button"
                  className={`btn btn-xs ${registerFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRegisterFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
              Showing {filteredSessions.length} lecture entries
            </div>
          </div>

          {loadingRegister ? (
            <LoadingState message="Fetching detailed lecture sessions…" />
          ) : filteredSessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No lecture sessions found"
              message="No recorded sessions found for the selected filter."
            />
          ) : (
            <div className="table-responsive" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table className="table" aria-label="Lecture sessions">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Lecture</th>
                    <th style={{ width: '22%' }}>Date</th>
                    <th style={{ width: '26%' }}>Period / Slot</th>
                    <th style={{ width: '25%' }}>Topic Covered</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, sIdx) => {
                    const isPresent = session.status === 'PRESENT';
                    return (
                      <tr key={session._id || sIdx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          #{session.lectureNum || sIdx + 1}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {formatDate(session.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                          {session.period || 'Scheduled Class'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {session.topic || 'Regular Curriculum Lecture'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: 11 }}
                          >
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          SHARED MODAL 2: CONNECT CODE BRIGADE / CHALKPAD PRO
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={connectModalOpen}
        onClose={() => {
          if (!connecting) {
            setConnectModalOpen(false);
            setOtpRequired(false);
            setCbPassword('');
            setCbOtpText('');
          }
        }}
        title="Connect Code Brigade / University Portal"
        subtitle="Synchronize your verified attendance and examination report card directly from Chitkara University."
        maxWidth={480}
      >
        <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 'var(--s3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 600, marginBottom: 4 }}>
            <ShieldCheck size={16} />
            <span>Encrypted Server-Side Authentication</span>
          </div>
          Your university credentials are used strictly server-side to establish an authorized session with{' '}
          <code style={{ color: 'var(--accent)', background: 'var(--bg-elevated)', padding: '2px 4px' }}>cuiet.codebrigade.in</code>.
          Passwords are never stored in the database.
        </div>

        {otpRequired ? (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <KeyRound size={14} className="text-accent" />
                <span>Enter OTP Code</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="6-digit verification code"
                value={cbOtpText}
                onChange={(e) => setCbOtpText(e.target.value)}
                autoFocus
              />
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
                Chitkara University portal requested verification. Sent to: <strong>{otpHint}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setOtpRequired(false)}
                disabled={connecting}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={connecting || !cbOtpText.trim()}
              >
                {connecting ? 'Verifying OTP…' : 'Verify & Synchronize'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConnectCodeBrigade}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">University Username / Roll Number</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. 241099XXXX or portal username"
                value={cbUsername}
                onChange={(e) => setCbUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Portal Password</label>
              <input
                type="password"
                required
                className="form-control"
                placeholder="Chalkpad Pro / Code Brigade password"
                value={cbPassword}
                onChange={(e) => setCbPassword(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">School / Institute Code</label>
              <input
                type="text"
                className="form-control"
                value={cbSchoolCode}
                onChange={(e) => setCbSchoolCode(e.target.value)}
                placeholder="800002"
              />
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                Default is <code>800002</code> for CUIET Chitkara University.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setConnectModalOpen(false)}
                disabled={connecting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={connecting || !cbUsername.trim() || !cbPassword.trim()}
              >
                {connecting ? 'Authenticating…' : 'Connect & Import'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          SHARED MODAL 3: QUICK MARK ATTENDANCE
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={markModalOpen}
        onClose={() => setMarkModalOpen(false)}
        title="Quick Mark Attendance"
        subtitle="Log a manual lecture session to keep your attendance metrics current."
        maxWidth={460}
      >
        <form onSubmit={handleQuickMarkSubmit}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Course</label>
            <select
              className="form-control"
              value={markSubjectId}
              onChange={(e) => setMarkSubjectId(e.target.value)}
              required
            >
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code || 'Course'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-control"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={markStatus}
                onChange={(e) => setMarkStatus(e.target.value)}
              >
                <option value="PRESENT">PRESENT</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Period / Lecture Slot</label>
            <input
              type="text"
              className="form-control"
              value={markPeriod}
              onChange={(e) => setMarkPeriod(e.target.value)}
              placeholder="e.g. Lecture 1 (09:00 - 10:00 AM)"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Topic Covered (Optional)</label>
            <input
              type="text"
              className="form-control"
              value={markTopic}
              onChange={(e) => setMarkTopic(e.target.value)}
              placeholder="e.g. Neural Networks Intro"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMarkModalOpen(false)}
              disabled={submittingMark}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submittingMark}
            >
              {submittingMark ? 'Recording…' : 'Record Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          SHARED MODAL 4: SOURCE STATUS & VERIFICATION INFO
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={sourceNoticeOpen}
        onClose={() => setSourceNoticeOpen(false)}
        title="University Data Source & Architecture"
        subtitle="Verification rules and architecture for CampusFlow AI academic records."
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
            {dataSource.notice || 'Chitkara University portal architecture uses server-side session authentication.'}
            {dataSource.lastSyncedAt && (
              <div style={{ marginTop: 6, color: 'var(--fg-primary)', fontFamily: 'var(--font-mono)' }}>
                Latest Synchronized: {formatDate(dataSource.lastSyncedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {dataSource.isConnected && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 4 }}>
              <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>
                Unlink University Account
              </div>
              <p style={{ fontSize: 12, margin: '0 0 8px 0' }}>
                Unlinking Code Brigade disconnects live synchronization. All existing attendance records and examination grade sheets remain saved in your account.
              </p>
              <button
                className="btn btn-danger btn-xs"
                onClick={handleDisconnectCodeBrigade}
                disabled={disconnecting}
              >
                <Unlink size={12} />
                {disconnecting ? 'Unlinking…' : 'Unlink Code Brigade Account'}
              </button>
            </div>
          )}

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
                onClick={() => {
                  setSourceNoticeOpen(false);
                  handleSyncAttendance();
                  handleSyncReportCard();
                }}
                disabled={syncing}
              >
                Synchronize All Records
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
