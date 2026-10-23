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
  ClipboardList,
  Bell,
  Search,
  BellOff,
  ArrowUpRight,
  Eye,
  RotateCcw
} from 'lucide-react';
import { attendanceAPI, subjectsAPI, recordsAPI } from '../services/api';
import { Modal, LoadingState, ErrorState, EmptyState } from '../components/SharedComponents';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';

export default function AcademicRecordsPage({
  initialTab = 'attendance',
  initialDashboardData = null,
  initialReportCardData = null,
}) {
  const { toast } = useToast();

  // Active Tab State: 'attendance' | 'report-card' | 'circulars'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'report-card' || tabParam === 'reportcard' || tabParam === 'grades') {
        return 'report-card';
      }
      if (tabParam === 'circulars' || tabParam === 'notices') {
        return 'circulars';
      }
    }
    return initialTab;
  });

  // Sync tab with URL search parameter smoothly
  const handleTabSwitch = (newTab) => {
    setActiveTab(newTab);
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location);
      if (newTab === 'report-card' || newTab === 'circulars') {
        url.searchParams.set('tab', newTab);
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''));
    }

    if (newTab === 'report-card' && !reportCardData && !loadingReportCard) {
      fetchReportCard();
    }
    if (newTab === 'circulars' && !circularsData && !loadingCirculars) {
      fetchCirculars();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. ATTENDANCE CORE STATE (100% PRESERVED FROM ATTENDANCE PAGE)
  // ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(() => !initialDashboardData);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(initialDashboardData);
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
  const [reportCardData, setReportCardData] = useState(initialReportCardData);
  const [loadingReportCard, setLoadingReportCard] = useState(() => activeTab === 'report-card' && !initialReportCardData);
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

  // ─────────────────────────────────────────────────────────────
  // 3. CIRCULARS & NOTICES CORE STATE
  // ─────────────────────────────────────────────────────────────
  const [circularsData, setCircularsData] = useState(null);
  const [loadingCirculars, setLoadingCirculars] = useState(() => activeTab === 'circulars');
  const [syncingCirculars, setSyncingCirculars] = useState(false);
  const [circularsError, setCircularsError] = useState('');
  const [circularsSearch, setCircularsSearch] = useState('');
  const [circularsCategory, setCircularsCategory] = useState('ALL');
  const [selectedCircular, setSelectedCircular] = useState(null);
  const [loadingCircularDetail, setLoadingCircularDetail] = useState(false);
  const [circularDetailError, setCircularDetailError] = useState(null);

  // Fetch University Circulars
  const fetchCirculars = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingCirculars(true);
    setCircularsError('');
    try {
      const res = await attendanceAPI.getCirculars();
      if (res.data) {
        setCircularsData(res.data);
      }
    } catch (err) {
      setCircularsError(err.message || 'Failed to retrieve university circulars.');
    } finally {
      if (!isSilent) setLoadingCirculars(false);
    }
  }, []);

  // Live Manual Synchronization of University Circulars
  const handleSyncCirculars = useCallback(async () => {
    setSyncingCirculars(true);
    setCircularsError('');
    try {
      const res = await attendanceAPI.syncCirculars();
      if (res.data) {
        setCircularsData(res.data);
      }
    } catch (err) {
      setCircularsError(err.message || 'Failed to synchronize university circulars.');
    } finally {
      setSyncingCirculars(false);
    }
  }, []);

  // Open Circular Notice & Fetch Complete Description
  const handleOpenCircular = useCallback(async (circ) => {
    if (!circ) return;
    setSelectedCircular(circ);
    setCircularDetailError(null);

    // If full description is already populated, no re-fetch is necessary
    if (circ.description && circ.description.trim().length > 30) {
      setLoadingCircularDetail(false);
      return;
    }

    setLoadingCircularDetail(true);
    try {
      const res = await attendanceAPI.getCircularDetail({
        id: circ.upstreamId || circ.id,
        timeStamp: circ.timeStamp || '',
        readBit: '0',
      });

      const detailData = res?.data?.data || res?.data;
      if (detailData?.success && (detailData.description || detailData.paragraphs?.length > 0)) {
        const updatedCirc = {
          ...circ,
          fullTitle: detailData.title || circ.fullTitle || circ.title,
          description: detailData.description,
          paragraphs: detailData.paragraphs || [],
          department: detailData.department || circ.department,
          hasAttachment: detailData.hasAttachment ?? circ.hasAttachment,
          attachmentUrl: detailData.attachmentUrl ?? circ.attachmentUrl,
          attachmentName: detailData.attachmentName || circ.attachmentName,
          attachmentNotice: detailData.attachmentNotice || (detailData.hasAttachment ? 'Official university attachment attached' : 'No attachment available'),
        };
        setSelectedCircular(updatedCirc);

        // Cache into circulars list
        setCircularsData(prev => {
          if (!prev || !Array.isArray(prev.circulars)) return prev;
          return {
            ...prev,
            circulars: prev.circulars.map(c => (c.id === circ.id ? updatedCirc : c)),
          };
        });
      } else {
        const errMsg = detailData?.message || detailData?.error || 'Full notice details could not be retrieved from university portal.';
        setCircularDetailError(errMsg);
      }
    } catch (err) {
      setCircularDetailError(err.message || 'Full notice details could not be retrieved.');
    } finally {
      setLoadingCircularDetail(false);
    }
  }, []);

  const handleRetryCircularDetail = useCallback(() => {
    if (selectedCircular) {
      handleOpenCircular(selectedCircular);
    }
  }, [selectedCircular, handleOpenCircular]);

  useEffect(() => {
    if (!initialDashboardData) {
      fetchSummary(threshold);
    }
  }, [fetchSummary, threshold, initialDashboardData]);

  useEffect(() => {
    if (activeTab === 'report-card' && !initialReportCardData && !reportCardData) {
      fetchReportCard();
    }
  }, [activeTab, fetchReportCard, initialReportCardData, reportCardData]);

  useEffect(() => {
    if (activeTab === 'circulars' && !circularsData) {
      fetchCirculars();
    }
  }, [activeTab, fetchCirculars, circularsData]);

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
        setAuthUserId(res.data?.authUserId || '');
        setOtpHint(res.data?.otpHint || '');
        setDeviceUUID(res.data?.deviceUUID || '');
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

  // Derived Attendance Data with bulletproof normalization
  const subjects = useMemo(() => {
    if (!Array.isArray(dashboardData?.subjects)) return [];
    return dashboardData.subjects.map(s => {
      const conducted = Math.max(0, Number(s?.totalClasses) || 0);
      const attended = Math.max(0, Number(s?.attendedClasses) || 0);
      const pct = typeof s?.attendancePercentage === 'number' && !isNaN(s.attendancePercentage)
        ? s.attendancePercentage
        : (conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0);
      const isShort = pct < threshold;
      return {
        ...s,
        totalClasses: conducted,
        attendedClasses: attended,
        missedClasses: Math.max(0, Number(s?.missedClasses) || (conducted - attended)),
        attendancePercentage: pct,
        badgeClass: s?.badgeClass || (conducted === 0 ? 'badge-neutral' : isShort ? 'badge-critical' : 'badge-safe'),
        colorHex: s?.colorHex || s?.color || (conducted === 0 ? 'var(--fg-faint)' : isShort ? 'var(--danger)' : 'var(--success)'),
        classesNeededForThreshold: Math.max(0, Number(s?.classesNeededForThreshold) || 0),
        classesCanMiss: Math.max(0, Number(s?.classesCanMiss) || 0),
        dutyLeave: Math.max(0, Number(s?.dutyLeave) || 0),
        medicalLeave: Math.max(0, Number(s?.medicalLeave) || 0),
      };
    });
  }, [dashboardData?.subjects, threshold]);

  const rawOverall = dashboardData?.overall;
  const overall = useMemo(() => {
    const conducted = Math.max(0, Number(rawOverall?.totalConducted ?? rawOverall?.totalClasses) || 0);
    const attended = Math.max(0, Number(rawOverall?.totalAttended ?? rawOverall?.attendedClasses) || 0);
    const missed = Math.max(0, Number(rawOverall?.totalMissed ?? rawOverall?.missedClasses) || Math.max(0, conducted - attended));
    const percentage = typeof rawOverall?.percentage === 'number' && !isNaN(rawOverall.percentage)
      ? rawOverall.percentage
      : (typeof rawOverall?.attendancePercentage === 'number' && !isNaN(rawOverall.attendancePercentage)
          ? rawOverall.attendancePercentage
          : (conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0));

    const isShortage = rawOverall?.standing?.isShortage ?? rawOverall?.isShortage ?? (conducted > 0 && percentage < threshold);
    const color = rawOverall?.standing?.color || rawOverall?.color || (conducted === 0 ? 'var(--fg-faint)' : isShortage ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)');
    const label = rawOverall?.standing?.label || rawOverall?.standingLabel || (conducted === 0 ? 'No Classes Recorded' : isShortage ? 'Attendance Shortage' : 'Good Standing');
    const badgeClass = rawOverall?.standing?.badgeClass || rawOverall?.badgeClass || (conducted === 0 ? 'badge-neutral' : isShortage ? 'badge-critical' : 'badge-safe');
    const status = rawOverall?.standing?.status || rawOverall?.status || (conducted === 0 ? 'NO_DATA' : isShortage ? 'SHORTAGE' : 'GOOD_STANDING');

    const recoveryMessage = rawOverall?.recovery?.message || rawOverall?.recoveryMessage || (isShortage ? `Attendance is below ${threshold}%. Recovery required.` : 'Attendance requirements currently met.');
    const canMissMessage = rawOverall?.canMiss?.message || rawOverall?.canMissMessage || (conducted === 0 ? 'No attendance buffer available.' : 'Attendance buffer within target range.');
    const classesNeeded = Math.max(0, Number(rawOverall?.recovery?.required ?? rawOverall?.classesNeededForThreshold) || 0);
    const classesCanMiss = Math.max(0, Number(rawOverall?.canMiss?.canMiss ?? rawOverall?.classesCanMiss) || 0);

    return {
      percentage,
      totalConducted: conducted,
      totalAttended: attended,
      totalMissed: missed,
      attendancePercentage: percentage,
      totalClasses: conducted,
      attendedClasses: attended,
      missedClasses: missed,
      threshold,
      color,
      standingLabel: label,
      badgeClass,
      status,
      isShortage,
      recoveryMessage,
      canMissMessage,
      classesNeededForThreshold: classesNeeded,
      classesCanMiss,
      standing: {
        status,
        label,
        badgeClass,
        color,
        isShortage,
      },
      recovery: {
        required: classesNeeded,
        isMet: rawOverall?.recovery?.isMet ?? rawOverall?.isTargetMet ?? !isShortage,
        impossible: rawOverall?.recovery?.impossible ?? rawOverall?.isTargetImpossible ?? false,
        message: recoveryMessage,
      },
      canMiss: {
        canMiss: classesCanMiss,
        isMet: rawOverall?.canMiss?.isMet ?? true,
        message: canMissMessage,
      },
    };
  }, [rawOverall, threshold]);

  const insights = dashboardData?.insights || [];
  const shortfalls = dashboardData?.shortfallRankings || [];
  const dataSource = dashboardData?.dataSource || {
    isConnected: false,
    provider: 'CAMPUSFLOW_LOCAL',
    providerLabel: 'Local Manual Records',
    badgeClass: 'badge-neutral',
  };

  // Polished Code Brigade connection state representation
  const attendanceConnectionState = useMemo(() => {
    const classCount = Array.isArray(subjects) ? subjects.length : 0;
    const countLabel = `${classCount} class${classCount === 1 ? '' : 'es'} synced`;

    if (connecting) {
      return {
        variant: 'connecting',
        statusText: 'Connecting…',
        secondaryText: 'Authenticating',
        ariaLabel: 'Code Brigade status: Connecting… Authenticating.',
      };
    }

    if (dataSource.provider === 'CODE_BRIGADE_EXPIRED') {
      return {
        variant: 'expired',
        statusText: 'Session expired',
        secondaryText: countLabel,
        ariaLabel: `Code Brigade status: Session expired. ${countLabel}. Action required: re-authenticate.`,
      };
    }

    if (dataSource.provider === 'CODE_BRIGADE_SYNC_PENDING') {
      return {
        variant: 'pending',
        statusText: 'Sync pending',
        secondaryText: countLabel,
        ariaLabel: `Code Brigade status: Sync pending. ${countLabel}.`,
      };
    }

    if (dataSource.isConnected) {
      return {
        variant: 'connected',
        statusText: 'Connected',
        secondaryText: countLabel,
        ariaLabel: `Code Brigade status: Connected. ${countLabel}.`,
      };
    }

    // Default disconnected
    return {
      variant: 'disconnected',
      statusText: 'Not connected',
      secondaryText: countLabel,
      ariaLabel: `Code Brigade status: Not connected. ${countLabel}.`,
    };
  }, [connecting, dataSource, subjects]);

  // Calculator computations
  const calcSubject = useMemo(() => {
    if (calcSubjectId === 'OVERALL') {
      const conducted = customConducted !== '' ? Math.max(0, Number(customConducted) || 0) : overall.totalConducted;
      const attended = customAttended !== '' ? Math.max(0, Number(customAttended) || 0) : overall.totalAttended;
      return {
        name: 'Overall Aggregate',
        totalClasses: conducted,
        attendedClasses: attended,
        percentage: conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0,
      };
    }
    const found = subjects.find(s => s._id === calcSubjectId);
    if (!found) return { name: 'Unknown', totalClasses: 0, attendedClasses: 0, percentage: 0 };
    const conducted = customConducted !== '' ? Math.max(0, Number(customConducted) || 0) : found.totalClasses;
    const attended = customAttended !== '' ? Math.max(0, Number(customAttended) || 0) : found.attendedClasses;
    return {
      name: found.name,
      totalClasses: conducted,
      attendedClasses: attended,
      percentage: conducted > 0 ? Math.round((attended / conducted) * 1000) / 10 : 0,
    };
  }, [calcSubjectId, customConducted, customAttended, overall.totalConducted, overall.totalAttended, subjects]);

  const calcResults = useMemo(() => {
    const rawA = customAttended !== '' ? Number(customAttended) : Number(calcSubject.attendedClasses);
    const rawC = customConducted !== '' ? Number(customConducted) : Number(calcSubject.totalClasses);
    const a = Math.max(0, isNaN(rawA) ? 0 : rawA);
    const c = Math.max(0, isNaN(rawC) ? 0 : rawC);
    const isInvalid = a > c && c > 0;
    const t = Math.min(100, Math.max(1, Number(calcTarget) || 75)) / 100;
    const currentPct = c > 0 ? Math.round((a / c) * 1000) / 10 : 0;

    let classesToAttend = 0;
    let classesCanMiss = 0;
    let impossible = false;

    if (c === 0) {
      return {
        currentPct: 0,
        classesToAttend: 0,
        classesCanMiss: 0,
        impossible: false,
        isTargetMet: false,
        noData: true,
        isInvalid: false,
        projectedPct: 0,
        a,
        c,
      };
    }

    if (isInvalid) {
      return {
        currentPct,
        classesToAttend: 0,
        classesCanMiss: 0,
        impossible: false,
        isTargetMet: false,
        noData: false,
        isInvalid: true,
        projectedPct: 0,
        a,
        c,
      };
    }

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

    const isTargetMet = currentPct >= (Number(calcTarget) || 75);
    let projectedPct = currentPct;
    if (isTargetMet && classesCanMiss > 0) {
      projectedPct = Math.round((a / (c + classesCanMiss)) * 1000) / 10;
    } else if (!isTargetMet && classesToAttend > 0) {
      projectedPct = Math.round(((a + classesToAttend) / (c + classesToAttend)) * 1000) / 10;
    }

    return {
      currentPct,
      classesToAttend,
      classesCanMiss,
      impossible,
      isTargetMet,
      noData: false,
      isInvalid: false,
      projectedPct,
      a,
      c,
    };
  }, [calcSubject, calcTarget, customAttended, customConducted]);

  // Circular gauge SVG calculations
  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, Number(overall.percentage) || 0)) / 100) * circumference;

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
  const record = reportCardData?.record || null;
  const rcDataSource = reportCardData?.dataSource || { isConnected: false };

  const rcConnectionState = useMemo(() => {
    if (syncingReportCard) {
      return {
        variant: 'connecting',
        statusText: 'Synchronizing…',
        secondaryText: 'Fetching grades',
      };
    }
    if (rcDataSource.isConnected) {
      return {
        variant: 'connected',
        statusText: 'Connected',
        secondaryText: 'Official grade card',
      };
    }
    return {
      variant: 'disconnected',
      statusText: 'Not connected',
      secondaryText: 'Portal sync required',
    };
  }, [syncingReportCard, rcDataSource]);
  const semesters = useMemo(() => {
    return Array.isArray(record?.semesters) ? record.semesters : [];
  }, [record]);

  const semestersList = useMemo(() => {
    if (selectedSemesterFilter === 'ALL') return semesters;
    return semesters.filter(s => s && s.semester === selectedSemesterFilter);
  }, [semesters, selectedSemesterFilter]);

  // Processed and Filtered Circulars
  const rawCirculars = useMemo(() => {
    return Array.isArray(circularsData?.circulars) ? circularsData.circulars : [];
  }, [circularsData]);

  const circDataSource = circularsData?.dataSource || {
    isConnected: dashboardData?.dataSource?.isConnected || false,
    studentName: dashboardData?.dataSource?.studentName || '',
    rollNumber: dashboardData?.dataSource?.rollNumber || '',
  };

  const filteredCirculars = useMemo(() => {
    let list = rawCirculars;
    if (circularsCategory !== 'ALL') {
      list = list.filter(c => String(c?.category || '').toUpperCase() === circularsCategory.toUpperCase());
    }
    if (circularsSearch.trim()) {
      const q = circularsSearch.toLowerCase();
      list = list.filter(c =>
        String(c?.title || '').toLowerCase().includes(q) ||
        String(c?.excerpt || c?.description || '').toLowerCase().includes(q) ||
        String(c?.refNo || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawCirculars, circularsCategory, circularsSearch]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: rawCirculars.length, ACADEMIC: 0, EXAMINATION: 0, ADMINISTRATIVE: 0, EVENTS: 0 };
    rawCirculars.forEach(c => {
      const cat = String(c?.category || '').toUpperCase();
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [rawCirculars]);

  return (
    <div className="page-container academic-records-container">
      <div className="attendly-dashboard">
        {/* ─────────────────────────────────────────────────────────────
            UNIFIED ACADEMIC RECORDS NAVIGATION BAR & BREADCRUMB
        ───────────────────────────────────────────────────────────── */}
        <div className="academic-records-topbar">
          <div className="academic-records-header-text">
            <div className="academic-records-breadcrumb" aria-label="Breadcrumb">
              <span>Academic</span>
              <ChevronRight size={11} className="breadcrumb-sep" aria-hidden="true" />
              <span className="breadcrumb-current">Academic Records</span>
            </div>
            <h1 className="academic-records-main-title">Academic Records</h1>
            <p className="academic-records-subtitle">
              Unified student intelligence suite for live attendance monitoring, official university report cards, and administrative circulars.
            </p>
          </div>

          {/* Tab Controls: Attendance, Report Card, Circulars */}
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

            <button
              className={`academic-pill-btn ${activeTab === 'circulars' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('circulars')}
              role="tab"
              aria-selected={activeTab === 'circulars'}
              id="tab-btn-circulars"
            >
              <Bell size={14} aria-hidden="true" />
              <span>Circulars</span>
              {Array.isArray(circularsData?.circulars) && circularsData.circulars.length > 0 ? (
                <span className="academic-tab-badge">{circularsData.circulars.length}</span>
              ) : (
                <span className="academic-tab-badge academic-badge-dot" title="University notices" />
              )}
            </button>
          </div>
        </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: ATTENDANCE SECTION (100% PRESERVED FUNCTIONALITY)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <>
          {/* Attendance Action Header */}
          <div className="attendly-header" style={{ marginTop: 'var(--s4)', borderBottom: 'none', paddingBottom: 0 }}>
            <div>
              <div className="attendly-kicker" style={{ margin: 0 }}>
                <span>ATTENDANCE INTELLIGENCE & REGISTERS</span>
                {dataSource.isConnected && (
                  <span className="attendly-live-pulse-dot" title="Connected to Code Brigade" />
                )}
              </div>
              <div className="attendly-subtitle" style={{ marginTop: 4 }}>
                {dataSource.isConnected && dataSource.studentName
                  ? `Authenticated as ${dataSource.studentName} (${dataSource.rollNumber || dataSource.className || 'CUIET'})`
                  : 'Delivered lectures, attendance percentages, and bunk safety margins.'}
              </div>
            </div>

            <div className="attendly-header-actions">
              {/* Connection Status Badge */}
              <button
                type="button"
                className={`attendly-status-badge attendly-status-badge--${attendanceConnectionState.variant}`}
                onClick={() => setSourceNoticeOpen(true)}
                title={dataSource.notice || 'Click to view university data origin and synchronization rules'}
                aria-label={attendanceConnectionState.ariaLabel}
                id="badge-attendance-connection-status"
              >
                <span className="attendly-status-indicator" aria-hidden="true">
                  {attendanceConnectionState.variant === 'connecting' ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : attendanceConnectionState.variant === 'expired' ? (
                    <AlertTriangle size={11} className="text-warning" />
                  ) : (
                    <span className={`attendly-status-dot attendly-status-dot--${attendanceConnectionState.variant}`} />
                  )}
                </span>
                <span className="attendly-status-text">
                  <span className="attendly-status-main">{attendanceConnectionState.statusText}</span>
                  <span className="attendly-status-sep" aria-hidden="true">·</span>
                  <span className="attendly-status-secondary">{attendanceConnectionState.secondaryText}</span>
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
              {/* 1. COMPACT EXECUTIVE ATTENDANCE SUMMARY */}
              <div className="attendly-summary-compact">
                <div className="attendly-summary-top-row">
                  {/* Overall Percentage + Status Badge */}
                  <div className="attendly-summary-pct-block">
                    <div
                      className="attendly-summary-pct-huge"
                      style={{
                        color: overall.totalConducted === 0
                          ? 'var(--fg-faint)'
                          : overall.percentage >= threshold
                            ? 'var(--success, #10B981)'
                            : 'var(--danger, #EF4444)'
                      }}
                    >
                      {overall.percentage}%
                    </div>
                    <div className="attendly-summary-pct-meta">
                      <span className="attendly-summary-pct-label">Aggregate Standing</span>
                      <span className={`badge ${overall.badgeClass}`}>
                        {overall.standingLabel}
                      </span>
                    </div>
                  </div>

                  {/* Attended / Conducted / Missed Counts */}
                  <div className="attendly-summary-metrics-strip">
                    <div className="attendly-summary-metric">
                      <span className="attendly-summary-metric-label">Attended</span>
                      <span className="attendly-summary-metric-val text-success">
                        {overall.totalAttended}
                      </span>
                    </div>
                    <div className="attendly-summary-metric">
                      <span className="attendly-summary-metric-label">Conducted</span>
                      <span className="attendly-summary-metric-val">
                        {overall.totalConducted}
                      </span>
                    </div>
                    <div className="attendly-summary-metric">
                      <span className="attendly-summary-metric-label">Missed</span>
                      <span className={`attendly-summary-metric-val ${overall.totalMissed > 0 ? 'text-danger' : 'text-neutral'}`}>
                        {overall.totalMissed}
                      </span>
                    </div>
                  </div>

                  {/* Target Threshold Controls */}
                  <div className="attendly-summary-threshold-col">
                    <span className="attendly-summary-threshold-label">
                      Target Threshold: <strong style={{ color: 'var(--fg-primary)' }}>{threshold}%</strong>
                    </span>
                    <div className="attendly-threshold-pills" role="radiogroup" aria-label="Target Attendance Threshold">
                      {[75, 80, 85].map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`attendly-pill-btn ${threshold === t ? 'active' : ''}`}
                          onClick={() => handleThresholdChange(t)}
                          aria-checked={threshold === t}
                          role="radio"
                        >
                          {t}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Recommendation & Direct Simulator Jump */}
                <div className="attendly-summary-bottom-row">
                  <div className="attendly-summary-status-pill">
                    {overall.totalConducted === 0 ? (
                      <>
                        <Info size={14} className="text-neutral" aria-hidden="true" />
                        <span style={{ color: 'var(--fg-muted)' }}>
                          No class sessions registered yet. Mark classes or connect Code Brigade to track attendance.
                        </span>
                      </>
                    ) : overall.percentage < threshold ? (
                      <>
                        <AlertTriangle size={14} className="text-danger" aria-hidden="true" />
                        <span>
                          <strong className="text-danger">Attendance Shortfall:</strong> {overall.recoveryMessage}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} className="text-success" aria-hidden="true" />
                        <span>
                          <strong className="text-success">Safety Margin:</strong> {overall.canMissMessage}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    className="attendly-summary-action-link"
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
                  icon={<BookOpen size={24} strokeWidth={1.5} />}
                  title="No subjects found"
                  description="No courses are currently being tracked. Connect your Code Brigade account to automatically synchronize subjects and attendance."
                  action={
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setConnectModalOpen(true)}
                      style={{ marginTop: 8 }}
                    >
                      <Link2 size={13} aria-hidden="true" />
                      Connect Code Brigade
                    </button>
                  }
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

                        {/* Progress Bar with Mathematically Aligned Threshold Marker */}
                        <div className="attendly-progress-wrapper">
                          <div className="attendly-progress-track">
                            <div
                              className="attendly-progress-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0, subjPct))}%`,
                                background: subj.totalClasses === 0
                                  ? 'var(--fg-faint)'
                                  : subjPct >= threshold
                                    ? 'var(--success, #10B981)'
                                    : 'var(--danger, #EF4444)',
                              }}
                            />
                            {/* Visual Threshold Marker */}
                            <div
                              className="attendly-threshold-indicator"
                              style={{ left: `${threshold}%` }}
                              title={`Target: ${threshold}%`}
                            />
                          </div>
                          <div className="attendly-progress-labels">
                            <span>0%</span>
                            <span className="attendly-threshold-label">Target {threshold}%</span>
                            <span>100%</span>
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
                              Attend next <strong>{subj.classesNeededForThreshold}</strong> {subj.classesNeededForThreshold === 1 ? 'consecutive class' : 'consecutive classes'} to reach {threshold}%
                            </span>
                          ) : (
                            <span className="text-success">
                              Can safely miss <strong>{subj.classesCanMiss}</strong> {subj.classesCanMiss === 1 ? 'consecutive class' : 'consecutive classes'}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="attendly-calc-icon">
                      <Calculator size={18} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--fg-primary)' }}>
                        Attendance Bunk & Recovery Simulator
                      </h3>
                      <p style={{ fontSize: 12.5, color: 'var(--fg-secondary)', margin: '2px 0 0' }}>
                        Simulate consecutive future classes to calculate safe absence allowances or required recovery lectures.
                      </p>
                    </div>
                  </div>
                  {(customAttended !== '' || customConducted !== '') && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setCustomAttended('');
                        setCustomConducted('');
                      }}
                      style={{ fontSize: 11.5 }}
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      Reset to Live Data
                    </button>
                  )}
                </div>

                <div className="attendly-calc-body">
                  {/* Left Column: Inputs */}
                  <div className="attendly-calc-inputs">
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" htmlFor="calc-subject-scope">
                        Course Selection
                      </label>
                      <select
                        id="calc-subject-scope"
                        className="form-control"
                        value={calcSubjectId}
                        onChange={(e) => {
                          setCalcSubjectId(e.target.value);
                          setCustomAttended('');
                          setCustomConducted('');
                        }}
                      >
                        <option value="OVERALL">Overall Aggregate Attendance</option>
                        {subjects.map(s => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.code || 'Course'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="calc-attended-input">
                          Classes Attended
                        </label>
                        <input
                          id="calc-attended-input"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder={String(calcSubject.attendedClasses)}
                          value={customAttended}
                          onChange={(e) => setCustomAttended(e.target.value)}
                        />
                        <span style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2, display: 'block' }}>
                          Current: {calcSubject.attendedClasses}
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="calc-conducted-input">
                          Classes Conducted
                        </label>
                        <input
                          id="calc-conducted-input"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder={String(calcSubject.totalClasses)}
                          value={customConducted}
                          onChange={(e) => setCustomConducted(e.target.value)}
                        />
                        <span style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2, display: 'block' }}>
                          Current: {calcSubject.totalClasses}
                        </span>
                      </div>
                    </div>

                    {calcResults.isInvalid && (
                      <div style={{ fontSize: 12, color: 'var(--danger, #EF4444)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} aria-hidden="true" />
                        <span>Attended classes cannot exceed conducted classes.</span>
                      </div>
                    )}

                    <div className="form-group" style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label className="form-label" style={{ margin: 0 }} htmlFor="calc-target-slider">
                          Target Attendance: <strong style={{ color: 'var(--fg-primary)' }}>{calcTarget}%</strong>
                        </label>
                        <div className="attendly-threshold-pills" role="radiogroup" aria-label="Target percentage preset">
                          {[75, 80, 85, 90].map(p => (
                            <button
                              key={p}
                              type="button"
                              className={`attendly-pill-btn ${calcTarget === p ? 'active' : ''}`}
                              onClick={() => setCalcTarget(p)}
                              aria-checked={calcTarget === p}
                              role="radio"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        id="calc-target-slider"
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

                  {/* Right Column: Live Output */}
                  <div className="attendly-calc-results">
                    <div className="attendly-calc-curr-pct">
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--fg-faint)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                          Current Standing
                        </span>
                        <div className="attendly-calc-pct-num">
                          {calcResults.currentPct}%
                        </div>
                      </div>

                      <div className="attendly-calc-badge-row">
                        {calcResults.noData ? (
                          <span className="attendly-calc-status-badge neutral">
                            <Info size={12} aria-hidden="true" />
                            No Data
                          </span>
                        ) : calcResults.isInvalid ? (
                          <span className="attendly-calc-status-badge risk">
                            <AlertTriangle size={12} aria-hidden="true" />
                            Invalid Input
                          </span>
                        ) : calcResults.isTargetMet ? (
                          <span className="attendly-calc-status-badge met">
                            <CheckCircle2 size={12} aria-hidden="true" />
                            Target Met
                          </span>
                        ) : (
                          <span className="attendly-calc-status-badge risk">
                            <AlertTriangle size={12} aria-hidden="true" />
                            Target at Risk
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="attendly-calc-answer-box">
                      {calcResults.noData ? (
                        <div className="attendly-calc-explanation">
                          No lecture sessions have been conducted yet. Mark class sessions or connect Code Brigade to begin simulation.
                        </div>
                      ) : calcResults.isInvalid ? (
                        <div className="attendly-calc-explanation text-danger">
                          Attended classes ({calcResults.a}) cannot be greater than total conducted classes ({calcResults.c}). Please adjust the counts.
                        </div>
                      ) : calcResults.impossible ? (
                        <div className="attendly-calc-explanation text-danger">
                          <strong>Target 100% Mathematically Unreachable:</strong> Because absences have already been recorded ({calcResults.c - calcResults.a} missed), 100% attendance cannot be achieved in this term.
                        </div>
                      ) : calcResults.isTargetMet ? (
                        <>
                          <div className="attendly-calc-stat-headline text-success">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            <span>Safe Absence Allowance</span>
                          </div>
                          <div className="attendly-calc-stat-big text-success">
                            {calcResults.classesCanMiss} {calcResults.classesCanMiss === 1 ? 'Class' : 'Classes'}
                          </div>
                          <p className="attendly-calc-explanation">
                            {calcResults.classesCanMiss === 0 ? (
                              <>You are exactly at the <strong>{calcTarget}%</strong> threshold. Any absence will result in attendance shortfall.</>
                            ) : (
                              <>You can safely miss up to <strong>{calcResults.classesCanMiss}</strong> consecutive {calcResults.classesCanMiss === 1 ? 'lecture' : 'lectures'} while keeping attendance at or above <strong>{calcTarget}%</strong>.</>
                            )}
                          </p>
                          {calcResults.classesCanMiss > 0 && (
                            <div className="attendly-calc-projection-tag">
                              <span>Projected after {calcResults.classesCanMiss} absences:</span>
                              <strong style={{ color: 'var(--fg-primary)' }}>{calcResults.projectedPct}%</strong>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="attendly-calc-stat-headline text-danger">
                            <AlertTriangle size={14} aria-hidden="true" />
                            <span>Recovery Classes Required</span>
                          </div>
                          <div className="attendly-calc-stat-big text-danger">
                            {calcResults.classesToAttend} {calcResults.classesToAttend === 1 ? 'Class' : 'Classes'}
                          </div>
                          <p className="attendly-calc-explanation">
                            You must attend the next <strong>{calcResults.classesToAttend}</strong> consecutive {calcResults.classesToAttend === 1 ? 'lecture' : 'lectures'} without any absence to reach <strong>{calcTarget}%</strong>.
                          </p>
                          {calcResults.classesToAttend > 0 && (
                            <div className="attendly-calc-projection-tag">
                              <span>Projected after {calcResults.classesToAttend} attendances:</span>
                              <strong style={{ color: 'var(--fg-primary)' }}>{calcResults.projectedPct}%</strong>
                            </div>
                          )}
                        </>
                      )}

                      <div className="attendly-calc-footnote">
                        <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                        <span>
                          Calculations assume future consecutive class sessions. Actual standing will depend on total lectures officially scheduled by university timetable.
                        </span>
                      </div>
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
              {/* Report Card Connection Status Badge */}
              <button
                type="button"
                className={`attendly-status-badge attendly-status-badge--${rcConnectionState.variant}`}
                onClick={() => setSourceNoticeOpen(true)}
                title="View university synchronization status"
                aria-label={`Code Brigade report card status: ${rcConnectionState.statusText}. Click for data origin details.`}
                id="badge-report-card-connection-status"
              >
                <span className="attendly-status-indicator" aria-hidden="true">
                  {rcConnectionState.variant === 'connecting' ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <span className={`attendly-status-dot attendly-status-dot--${rcConnectionState.variant}`} />
                  )}
                </span>
                <span className="attendly-status-text">
                  <span className="attendly-status-main">{rcConnectionState.statusText}</span>
                  <span className="attendly-status-sep" aria-hidden="true">·</span>
                  <span className="attendly-status-secondary">{rcConnectionState.secondaryText}</span>
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
          ) : semesters.length === 0 ? (
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
                    {record.summary?.latestSgpa ?? (semesters[semesters.length - 1]?.sgpa ?? 'N/A')}
                  </div>
                  <div className="report-card-hero-meta">
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {semesters[semesters.length - 1]?.semester || 'Latest Term'}
                    </span>
                  </div>
                </div>

                {/* Total Credits Earned */}
                <div className="report-card-hero-card">
                  <div className="report-card-hero-label">Total Credits Earned</div>
                  <div className="report-card-hero-num">{record.summary?.totalCreditsEarned ?? 0}</div>
                  <div className="report-card-hero-meta">
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Across {record.summary?.totalSemesters ?? semesters.length} Completed Terms
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
                    All Terms ({semesters.length})
                  </button>
                  {semesters.map((s, sIdx) => (
                    <button
                      key={s?.semester || sIdx}
                      type="button"
                      className={`report-filter-btn ${selectedSemesterFilter === s?.semester ? 'active' : ''}`}
                      onClick={() => setSelectedSemesterFilter(s?.semester)}
                    >
                      {s?.semester || `Semester ${sIdx + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Semester Breakdown Cards */}
              <div className="report-card-semesters-list">
                {semestersList.map((sem, sIdx) => (
                  <div key={sem?.semester || sIdx} className="report-card-semester-box">
                    <div className="semester-box-header">
                      <div className="semester-box-title">
                        <GraduationCap size={16} className="text-accent" />
                        <span>Study Period: {sem?.semester || 'Term'}</span>
                      </div>
                      <div className="semester-box-metrics">
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">SGPA</span>
                          <span className="sem-metric-val">{sem?.sgpa ?? '—'}</span>
                        </div>
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">CGPA</span>
                          <span className="sem-metric-val">{sem?.cgpa ?? '—'}</span>
                        </div>
                        <div className="sem-metric-pill">
                          <span className="sem-metric-label">Credits</span>
                          <span className="sem-metric-val">{sem?.totalCredits ?? '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Subjects Table */}
                    <div className="table-responsive" style={{ margin: 0 }}>
                      <table className="report-card-table" aria-label={`Examination results for ${sem?.semester || 'Semester'}`}>
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
                          {(sem?.subjects || []).map((subj, cIdx) => {
                            const gradeStyle = getGradeStyle(subj?.grade);
                            return (
                              <tr key={subj?.code || cIdx}>
                                <td style={{ textAlign: 'center', color: 'var(--fg-faint)', fontSize: 12 }}>
                                  {subj?.sNo || cIdx + 1}
                                </td>
                                <td>
                                  <span className="report-code-badge">{subj?.code || 'NO-CODE'}</span>
                                </td>
                                <td>
                                  <div className="report-course-name">{subj?.name || 'Course'}</div>
                                </td>
                                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                  {Number(subj?.credits || 0).toFixed(2)}
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
                                    {subj?.grade || '—'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span
                                    className={`badge ${subj?.status === 'PASS' ? 'badge-success' : 'badge-danger'}`}
                                    style={{ fontSize: 11, padding: '2px 8px' }}
                                  >
                                    {subj?.status || 'UNKNOWN'}
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
              {Array.isArray(record?.officialNotes) && record.officialNotes.length > 0 && (
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
          TAB 3: CIRCULARS SECTION (OFFICIAL NOTICES & ANNOUNCEMENTS)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'circulars' && (
        <div className="circulars-section">
          {/* Header & Controls */}
          <div className="circulars-header-actions">
            <div>
              <div className="attendly-kicker" style={{ margin: 0 }}>
                <span>OFFICIAL UNIVERSITY NOTICES</span>
                {circDataSource.isConnected && (
                  <span className="attendly-live-pulse-dot" title="Connected to Code Brigade" />
                )}
              </div>
              <div className="attendly-subtitle" style={{ marginTop: 4 }}>
                {circDataSource.isConnected && circDataSource.studentName
                  ? `Authenticated as ${circDataSource.studentName} (${circDataSource.rollNumber || 'Chitkara University'})`
                  : 'Official circulars, examination notifications, and administrative announcements.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {circDataSource.isConnected && (
                <span className="circulars-status-pill" style={{ margin: 0, padding: '4px 10px' }}>
                  <span className="status-dot connected" />
                  <span>
                    {syncingCirculars
                      ? 'Synchronizing...'
                      : (circDataSource.lastSyncedAt
                          ? `Live Sync Verified • ${formatDate(circDataSource.lastSyncedAt, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`
                          : 'Connected to Code Brigade')}
                  </span>
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSyncCirculars}
                disabled={syncingCirculars || loadingCirculars}
                title="Synchronize latest circulars from Code Brigade"
                id="btn-refresh-circulars"
              >
                <RefreshCw size={13} className={syncingCirculars ? 'animate-spin' : ''} aria-hidden="true" />
                <span>{syncingCirculars ? 'Syncing...' : 'Sync Circulars'}</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="circulars-filter-bar">
            <div className="circulars-search-box">
              <Search size={14} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="form-control circulars-search-input"
                placeholder="Search circulars by title, topic, or ref..."
                value={circularsSearch}
                onChange={(e) => setCircularsSearch(e.target.value)}
                id="input-search-circulars"
              />
            </div>

            <div className="circulars-category-pills" role="radiogroup" aria-label="Circular Category Filter">
              {['ALL', 'ACADEMIC', 'EXAMINATION', 'ADMINISTRATIVE', 'EVENTS'].map(cat => {
                const count = categoryCounts[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`circulars-category-btn ${circularsCategory === cat ? 'active' : ''}`}
                    onClick={() => setCircularsCategory(cat)}
                    role="radio"
                    aria-checked={circularsCategory === cat}
                  >
                    <span>{cat === 'ALL' ? 'All Notices' : cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                    <span className="circulars-count-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Content: Loading, Error, Disconnected, Unavailable, or Live Feed */}
          {loadingCirculars ? (
            <LoadingState message="Connecting to university portal for circulars…" />
          ) : circularsError ? (
            <ErrorState message={circularsError} onRetry={() => fetchCirculars()} />
          ) : !circDataSource.isConnected && rawCirculars.length === 0 ? (
            <div className="circulars-notice-card">
              <div className="circulars-notice-icon">
                <BellOff size={26} aria-hidden="true" />
              </div>
              <div className="circulars-status-pill">
                <span className="status-dot" />
                <span>University Connection Required</span>
              </div>
              <h3 className="circulars-notice-title">Synchronize University Circulars</h3>
              <p className="circulars-notice-text">
                Connect your Chitkara University / Code Brigade account to automatically stream official academic circulars, examination notifications, and administrative updates.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setConnectModalOpen(true)}
                style={{ marginTop: 'var(--s2)' }}
              >
                <Link2 size={13} aria-hidden="true" />
                <span>Connect Code Brigade</span>
              </button>
            </div>
          ) : rawCirculars.length === 0 ? (
            <div className="circulars-notice-card">
              <div className="circulars-notice-icon">
                <Bell size={26} aria-hidden="true" />
              </div>
              <div className="circulars-status-pill">
                <span className="status-dot connected" />
                <span>Connected to Code Brigade ({circDataSource.studentName || 'Authenticated'})</span>
              </div>
              <h3 className="circulars-notice-title">Official Upstream Endpoint Notice</h3>
              <p className="circulars-notice-text">
                Your live attendance and report card records are synchronized with Chitkara University Code Brigade. Official university circulars and notices require a verified Chalkpad Pro circulars upstream endpoint.
              </p>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                padding: '12px 18px',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--fg-secondary)',
                maxWidth: 580,
                marginTop: 'var(--s2)',
                lineHeight: 1.6,
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>
                  <ShieldCheck size={14} />
                  <span>Academic Integrity Guarantee</span>
                </div>
                CampusFlow AI maintains strict data integrity: attendance registers and semester grade sheets are verified live from university servers. CampusFlow AI will never fabricate artificial circulars.
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchCirculars()}
                style={{ marginTop: 'var(--s3)' }}
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Check University Sync</span>
              </button>
            </div>
          ) : filteredCirculars.length === 0 ? (
            <EmptyState
              icon={<Search size={24} strokeWidth={1.5} />}
              title="No matching circulars found"
              description={`No notices found matching "${circularsSearch}" in category "${circularsCategory}". Try clearing your search or choosing All Notices.`}
              action={
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setCircularsSearch('');
                    setCircularsCategory('ALL');
                  }}
                  style={{ marginTop: 8 }}
                >
                  Clear Filters
                </button>
              }
            />
          ) : (
            <div className="circulars-feed-grid">
              {filteredCirculars.map((circ, idx) => {
                const recent = circ.date && (Date.now() - new Date(circ.date).getTime()) < (7 * 24 * 60 * 60 * 1000);
                return (
                  <div
                    key={circ.id || circ._id || idx}
                    className="circular-card"
                    onClick={() => handleOpenCircular(circ)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenCircular(circ); } }}
                  >
                    <div className="circular-card-top">
                      <div className="circular-badge-group">
                        <span className="circular-category-badge">{circ.category || 'NOTICE'}</span>
                        {recent && <span className="circular-new-badge">NEW</span>}
                        {circ.department && (
                          <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                            • {circ.department}
                          </span>
                        )}
                      </div>
                      <div className="circular-date-text">
                        <Calendar size={12} aria-hidden="true" />
                        <span>{formatDate(circ.date || circ.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <h3 className="circular-title">{circ.title}</h3>

                    {circ.excerpt && (
                      <p className="circular-excerpt">{circ.excerpt}</p>
                    )}

                    <div className="circular-footer">
                      <div className="circular-ref-num" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>{circ.refNo ? `Ref: ${circ.refNo}` : 'Official University Notice'}</span>
                        {circ.attachmentUrl ? (
                          <span className="circular-attach-pill">
                            <FileText size={10} aria-hidden="true" />
                            <span>Attachment</span>
                          </span>
                        ) : (
                          <span className="circular-no-attach-pill">
                            No attachment
                          </span>
                        )}
                      </div>
                      <div className="circular-links" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleOpenCircular(circ)}
                          title="View complete official notice"
                          id={`btn-read-circular-${idx}`}
                        >
                          <Eye size={12} aria-hidden="true" />
                          <span>Read full notice</span>
                        </button>
                        {circ.attachmentUrl && (
                          <a
                            href={circ.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-xs"
                          >
                            <FileText size={12} aria-hidden="true" />
                            <span>Download</span>
                            <ExternalLink size={10} aria-hidden="true" />
                          </a>
                        )}
                        {circ.sourceUrl && (
                          <a
                            href={circ.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                          >
                            <span>University Portal</span>
                            <ArrowUpRight size={11} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
              icon={<Calendar size={24} strokeWidth={1.5} />}
              title="No lecture sessions found"
              description="No recorded sessions found for the selected filter."
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
                  {(filteredSessions || []).map((session, sIdx) => {
                    const isPresent = session?.status === 'PRESENT';
                    return (
                      <tr key={session?._id || sIdx}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                          #{session?.lectureNum || sIdx + 1}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {formatDate(session?.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>
                          {session?.period || 'Scheduled Class'}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {session?.topic || 'Regular Curriculum Lecture'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={`badge ${isPresent ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: 11 }}
                          >
                            {session?.status || 'UNKNOWN'}
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

      {/* ─────────────────────────────────────────────────────────────
          SHARED MODAL 5: OFFICIAL CIRCULAR DETAILS
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(selectedCircular)}
        onClose={() => {
          setSelectedCircular(null);
          setCircularDetailError(null);
          setLoadingCircularDetail(false);
        }}
        title="Official University Notice"
        maxWidth={780}
      >
        {selectedCircular && (
          <div className="circular-modal-container">
            {/* Notice Header Metadata */}
            <div className="circular-modal-header">
              <div className="circular-badge-row">
                <span className="circular-category-badge">{selectedCircular.category || 'NOTICE'}</span>
                {selectedCircular.department && (
                  <span className="circular-dept-tag">
                    • {selectedCircular.department}
                  </span>
                )}
                {selectedCircular.addedBy && selectedCircular.addedBy !== selectedCircular.department && (
                  <span className="circular-author-tag">
                    (Issued by {selectedCircular.addedBy})
                  </span>
                )}
              </div>
              <div className="circular-date-text">
                <Calendar size={13} aria-hidden="true" />
                <span>{selectedCircular.rawDateTime || selectedCircular.displayDate || formatDate(selectedCircular.date)}</span>
              </div>
            </div>

            {/* Reference Number */}
            {selectedCircular.refNo && (
              <div className="circular-modal-ref">
                <span className="ref-label">REF:</span> {selectedCircular.refNo}
              </div>
            )}

            {/* Full Official Title */}
            <h2 className="circular-modal-title">
              {selectedCircular.fullTitle || selectedCircular.title}
            </h2>

            {/* Subject (if provided) */}
            {selectedCircular.subject && (
              <div className="circular-modal-subject">
                <strong>Subject:</strong> {selectedCircular.subject}
              </div>
            )}

            {/* Notice Body: Loading, Error, or Full Content */}
            {loadingCircularDetail ? (
              <div className="circular-detail-loading" id="circular-detail-loading">
                <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <span>Retrieving complete official notice from university portal...</span>
              </div>
            ) : circularDetailError ? (
              <div className="circular-detail-error-box" id="circular-detail-error">
                <div className="error-icon-row">
                  <AlertTriangle size={18} style={{ color: 'var(--danger, #EF4444)' }} />
                  <strong>Full notice details could not be retrieved</strong>
                </div>
                <p className="error-message">
                  {circularDetailError}
                </p>
                <div className="error-action-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleRetryCircularDetail}
                    id="btn-retry-circular-detail"
                  >
                    <RefreshCw size={12} />
                    <span>Retry Loading Details</span>
                  </button>
                  {selectedCircular.sourceUrl && (
                    <a
                      href={selectedCircular.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      <span>Check on University Portal</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ) : selectedCircular.description ? (
              <div className="circular-modal-body" id="circular-modal-body">
                {selectedCircular.paragraphs && selectedCircular.paragraphs.length > 0 ? (
                  selectedCircular.paragraphs.map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))
                ) : (
                  selectedCircular.description.split('\n\n').filter(Boolean).map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))
                )}
              </div>
            ) : (
              <div className="circular-detail-error-box">
                <div className="error-icon-row">
                  <AlertTriangle size={18} style={{ color: 'var(--warning, #F59E0B)' }} />
                  <strong>Notice Description Unavailable</strong>
                </div>
                <p className="error-message">
                  The complete official notice description has not yet been streamed from the university timeline.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRetryCircularDetail}
                >
                  <RefreshCw size={12} />
                  <span>Fetch Details</span>
                </button>
              </div>
            )}

            {/* Official Attachment Section */}
            <div className="circular-modal-attachment-section">
              <div className="attach-meta-left">
                <FileText size={16} style={{ color: selectedCircular.attachmentUrl ? '#38bdf8' : 'var(--fg-muted)' }} />
                <div>
                  <div className="attach-title">Official Attachment</div>
                  <div className="attach-subtitle">
                    {selectedCircular.attachmentUrl
                      ? (selectedCircular.attachmentName || 'Verified university document attached')
                      : 'No attachment available (source: ---)'}
                  </div>
                </div>
              </div>

              {selectedCircular.attachmentUrl ? (
                <a
                  href={selectedCircular.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  id="btn-download-circular-attachment"
                >
                  <FileText size={13} />
                  <span>Download Attachment</span>
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span className="circular-no-attach-pill">No attachment available</span>
              )}
            </div>

            {/* University Verification Guarantee */}
            <div className="circular-modal-guarantee">
              <ShieldCheck size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span>
                Verified university notification streamed live from Chitkara University Code Brigade student portal.
              </span>
            </div>

            {/* Actions */}
            <div className="circular-modal-actions">
              {circularDetailError && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleRetryCircularDetail}
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              )}
              {selectedCircular.sourceUrl && (
                <a
                  href={selectedCircular.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <span>Open University Portal</span>
                  <ArrowUpRight size={12} />
                </a>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedCircular(null);
                  setCircularDetailError(null);
                  setLoadingCircularDetail(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
      </div>
    </div>
  );
}
