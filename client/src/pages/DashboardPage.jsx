import React, { useState, useEffect } from 'react';
import { intelligenceAPI } from '../services/api';
import { LoadingState, ErrorState, AcademicHealthRing, ProgressBar } from '../components/SharedComponents';
import { getGreeting, deadlineLabel, getPriorityBadgeClass } from '../utils/helpers';
import {
  RefreshCw, AlertTriangle, ArrowRight, BookOpen, CheckSquare, FileText,
  Activity, Plus, Calendar, ShieldCheck, Clock, Zap
} from 'lucide-react';

export default function DashboardPage({ onNavigate }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Aggregating academic workspace…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!data)   return null;

  const {
    user,
    academicHealth = 0,
    overallAttendance = null,
    briefing = '',
    nextAction = null,
    subjectsSummary = [],
    summary = {},
    todaysFocus = [],
    academicAlerts = [],
    upcomingExams = [],
    conflicts = [],
  } = data;

  const {
    totalSubjects = 0,
    pendingTasks = 0,
    upcomingExams: upcomingExamsCount = 0,
    highRiskSubjects = 0,
    completedTasks = 0,
    totalTasks = 0,
  } = summary;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Genuine average attendance from stored subject data
  const avgAttendance = typeof overallAttendance === 'number' ? overallAttendance : null;

  const healthLevel = academicHealth >= 75 ? 'Optimal' : academicHealth >= 50 ? 'Moderate' : 'Critical';
  const healthColor = academicHealth >= 75 ? 'var(--success)' : academicHealth >= 50 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="page-container">
      {/* ── DASHBOARD HEADER ── */}
      <div className="dash-header-section" style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--s4)',
        marginBottom: 'var(--s8)',
        paddingBottom: 'var(--s6)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ width: 6, height: 6, background: 'var(--accent)' }} aria-hidden="true" />
            Academic Headquarters
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.8rem, 4vw, 2.75rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: 0,
            lineHeight: 1.1,
          }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Scholar'}.
          </h1>
          <p style={{
            color: 'var(--fg-muted)',
            fontSize: 13,
            marginTop: 6,
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}>
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span>
              {user?.course ? `${user.course} (Sem ${user.semester || 1})` : 'Active Session'}
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ color: healthColor, fontWeight: 600 }}>
              Health: {healthLevel} ({academicHealth}%)
            </span>
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('tasks')}
            id="dash-quick-task"
            title="Create a new academic task"
          >
            <Plus size={13} strokeWidth={2.2} aria-hidden="true" />
            <span>New Task</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('records')}
            id="dash-quick-attendance"
            title="Review attendance and official university examination records"
          >
            <Activity size={13} strokeWidth={2} aria-hidden="true" />
            <span>Academic Records</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('planner')}
            id="dash-quick-planner"
            title="Launch adaptive daily study plan"
          >
            <Zap size={13} strokeWidth={2.2} aria-hidden="true" />
            <span>Study Plan</span>
          </button>
        </div>
      </div>

      {/* ── DAILY ACADEMIC BRIEFING ── */}
      {briefing && (
        <div style={{
          marginBottom: 'var(--s5)',
          padding: '14px 18px',
          background: 'rgba(255, 61, 0, 0.04)',
          border: '1px solid rgba(255, 61, 0, 0.18)',
          borderLeft: '3px solid var(--accent)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <Activity size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div style={{ flex: 1, fontSize: 13, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
            <span style={{ fontWeight: 700, color: 'var(--fg-primary)', marginRight: 6, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
              Daily Intelligence Briefing:
            </span>
            {briefing}
          </div>
        </div>
      )}

      {/* ── PRIORITIZED NEXT ACTION CARD ── */}
      {nextAction && (
        <div style={{
          marginBottom: 'var(--s6)',
          padding: '14px 18px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${nextAction.urgency === 'CRITICAL' ? 'var(--danger)' : nextAction.urgency === 'HIGH' ? 'var(--warning)' : 'var(--accent)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: nextAction.urgency === 'CRITICAL' ? 'var(--danger)' : nextAction.urgency === 'HIGH' ? 'var(--warning)' : 'var(--accent)',
              flexShrink: 0,
            }}>
              <Zap size={16} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                Prioritized Next Action
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg-primary)', lineHeight: 1.2, marginTop: 2 }}>
                {nextAction.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                {nextAction.subtitle}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate(nextAction.targetPage)}
            id="dash-btn-next-action"
            style={{ gap: 6 }}
          >
            <span>{nextAction.buttonLabel}</span>
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ── CONFLICT BANNER ── */}
      {conflicts?.length > 0 && (
        <div className="conflict-banner" role="alert" style={{
          marginBottom: 'var(--s6)',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderLeft: '4px solid var(--danger)',
          padding: '14px 18px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Urgent Schedule Conflict
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginTop: 2 }}>
              {conflicts[0].message || conflicts[0].description || 'Multiple overlapping academic deadlines detected this week.'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onNavigate('tasks')}
            style={{ color: 'var(--danger)', fontSize: 12 }}
          >
            Resolve
          </button>
        </div>
      )}

      {/* ── KEY ACADEMIC METRICS (5 Cards) ── */}
      <div
        role="region"
        aria-label="Academic statistics overview"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--s4)',
          marginBottom: 'var(--s8)',
        }}
      >
        <div
          className="stat-card"
          onClick={() => onNavigate('subjects')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="Click to view all enrolled subjects"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Active Subjects</span>
            <span className="stat-card-icon" aria-hidden="true"><BookOpen size={14} /></span>
          </div>
          <div className="stat-card-value">{totalSubjects}</div>
          <div className="stat-card-detail" style={{ color: 'var(--fg-muted)' }}>
            Enrolled curriculum
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate('tasks')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="Click to view task backlog"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Pending Tasks</span>
            <span className="stat-card-icon" style={{ color: 'var(--warning)' }} aria-hidden="true"><CheckSquare size={14} /></span>
          </div>
          <div className="stat-card-value" style={{ color: pendingTasks > 5 ? 'var(--warning)' : 'var(--fg-primary)' }}>
            {pendingTasks}
          </div>
          <div className="stat-card-detail" style={{ color: 'var(--fg-muted)' }}>
            {completionRate}% completed
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate('exams')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="Click to view exam schedule"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Upcoming Exams</span>
            <span className="stat-card-icon" style={{ color: 'var(--accent)' }} aria-hidden="true"><FileText size={14} /></span>
          </div>
          <div className="stat-card-value" style={{ color: upcomingExamsCount > 0 ? 'var(--accent)' : 'var(--fg-primary)' }}>
            {upcomingExamsCount}
          </div>
          <div className="stat-card-detail" style={{ color: 'var(--fg-muted)' }}>
            Next 14 days
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate('records')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="Click to view full attendance dashboard"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Attendance</span>
            <span className="stat-card-icon" style={{ color: avgAttendance === null ? 'var(--fg-muted)' : avgAttendance >= 75 ? 'var(--success)' : 'var(--danger)' }} aria-hidden="true"><Activity size={14} /></span>
          </div>
          <div className="stat-card-value" style={{ color: avgAttendance === null ? 'var(--fg-muted)' : avgAttendance >= 75 ? 'var(--success)' : 'var(--danger)' }}>
            {avgAttendance === null ? '—' : `${avgAttendance}%`}
          </div>
          <div className="stat-card-detail" style={{ color: avgAttendance === null ? 'var(--fg-muted)' : avgAttendance >= 75 ? 'var(--success)' : 'var(--danger)' }}>
            {avgAttendance === null ? 'No class records logged' : avgAttendance >= 75 ? 'Above 75% goal' : 'Shortfall alert'}
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigate('recommendations')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          title="Click to view risk analysis and recommendations"
        >
          <div className="stat-card-header">
            <span className="stat-card-label">Academic Risk</span>
            <span className="stat-card-icon" style={{ color: highRiskSubjects > 0 ? 'var(--danger)' : 'var(--success)' }} aria-hidden="true">
              <ShieldCheck size={14} />
            </span>
          </div>
          <div className="stat-card-value" style={{ color: highRiskSubjects > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {highRiskSubjects}
          </div>
          <div className="stat-card-detail" style={{ color: highRiskSubjects > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {highRiskSubjects > 0 ? 'Action required' : 'All subjects safe'}
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD GRID ── */}
      <div className="dashboard-grid">
        {/* ── Left Column: Academic Health & Intelligence Breakdown ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Intelligence Index
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Academic Health</h3>
            </div>
            <span style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              border: `1px solid ${healthColor}`,
              color: healthColor,
              fontWeight: 700,
            }}>
              {healthLevel}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--s4) 0' }}>
            <AcademicHealthRing score={academicHealth} size={130} />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--fg-muted)' }}>Average Attendance</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: avgAttendance === null ? 'var(--fg-muted)' : avgAttendance >= 75 ? 'var(--success)' : 'var(--danger)' }}>
                  {avgAttendance === null ? 'No class data' : `${avgAttendance}%`}
                </span>
              </div>
              <ProgressBar
                value={avgAttendance || 0}
                color={avgAttendance === null ? 'var(--border-strong)' : avgAttendance >= 75 ? 'var(--success)' : avgAttendance >= 65 ? 'var(--warning)' : 'var(--danger)'}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--fg-muted)' }}>Task Velocity</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--fg-primary)' }}>
                  {completionRate}% ({completedTasks}/{totalTasks || 0})
                </span>
              </div>
              <ProgressBar value={completionRate} color="var(--accent)" />
            </div>

            <div style={{
              fontSize: 11,
              lineHeight: 1.5,
              color: 'var(--fg-faint)',
              marginTop: 'var(--s2)',
              paddingTop: 'var(--s3)',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              Computed from attendance safety (40%), pending deadlines (35%), and exam timeline margins (25%).
            </div>
          </div>
        </div>

        {/* ── Middle/Right Column: Priority Queue (Today's Focus) ── */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                Dynamic Priority Engine
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Priority Queue</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('tasks')}
              id="dash-view-tasks"
              style={{ fontSize: 12, gap: 4 }}
            >
              All Tasks <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          {todaysFocus.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 16px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 4,
            }}>
              <CheckSquare size={28} style={{ color: 'var(--success)', marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)' }}>Zero Pending Urgencies</div>
              <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: '6px 0 16px', maxWidth: 260 }}>
                You've cleared high-priority academic tasks for today.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('tasks')}
              >
                + Add Academic Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaysFocus.slice(0, 5).map((task) => (
                <div
                  key={task._id}
                  className={`priority-card priority-card-${(task.priorityLevel || 'MEDIUM').toLowerCase()}`}
                  style={{ padding: '12px 14px' }}
                >
                  <div className="priority-card-header" style={{ marginBottom: 6 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="priority-card-title" style={{ fontSize: 13.5, fontWeight: 700 }}>{task.title}</div>
                      {task.subject && (
                        <div className="priority-card-subject" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)' }}>
                          {task.subject.code ? `${task.subject.code} · ` : ''}{task.subject.name}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 900,
                        lineHeight: 1,
                        color: task.priorityLevel === 'HIGH' ? 'var(--danger)' : task.priorityLevel === 'MEDIUM' ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {task.priorityScore ?? '—'}
                      </div>
                      <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>urgency</div>
                    </div>
                  </div>
                  <div className="priority-card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="priority-card-meta-item" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      <Clock size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {deadlineLabel(task.deadline)}
                    </span>
                    <span className={getPriorityBadgeClass(task.priorityLevel)} style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                      {task.priorityLevel}
                    </span>
                  </div>
                  {task.priorityExplanation && (
                    <div className="priority-explanation" style={{ fontSize: 11.5, marginTop: 6 }}>
                      {task.priorityExplanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── At-Risk Subjects Alerts ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                Early Warning Engine
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Academic Risk Alerts</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('subjects')}
              id="dash-view-subjects"
              style={{ fontSize: 12, gap: 4 }}
            >
              All Subjects <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          {academicAlerts.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(16, 185, 129, 0.04)',
              borderRadius: 4,
            }}>
              <ShieldCheck size={24} style={{ color: 'var(--success)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>Safe Academic Standing</div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 0' }}>
                All enrolled courses satisfy attendance thresholds and score benchmarks.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {academicAlerts.map((subj) => {
                const attPct = subj.attendance?.currentPct || 0;
                const isHigh = subj.riskLevel === 'HIGH';
                const color  = isHigh ? 'var(--danger)' : 'var(--warning)';
                return (
                  <div key={subj._id} style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${color}`,
                    background: 'var(--bg-elevated)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-primary)', lineHeight: 1.2 }}>
                          {subj.subjectName || subj.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {subj.subjectCode || subj.code}
                        </div>
                      </div>
                      <span className={`badge badge-${isHigh ? 'high' : 'medium'}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                        {subj.riskLevel} RISK
                      </span>
                    </div>
                    <ProgressBar value={attPct} color={color} label={`Attendance: ${attPct}%`} />
                    {subj.riskFactors?.[0] && (
                      <div style={{ fontSize: 11.5, color: 'var(--fg-secondary)', marginTop: 8 }}>
                        {subj.riskFactors[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming Exams Timeline ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                Exam Calendar
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Upcoming Exams</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('exams')}
              id="dash-view-exams"
              style={{ fontSize: 12, gap: 4 }}
            >
              All Exams <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          {upcomingExams.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 4,
            }}>
              <Calendar size={24} style={{ color: 'var(--fg-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)' }}>No Exams in Next 14 Days</div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 12px' }}>
                Your immediate examination schedule is clear.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('exams')}
              >
                + Schedule Exam
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingExams.slice(0, 4).map((exam) => {
                const days = Math.ceil((new Date(exam.date) - new Date()) / 86400000);
                const color = days <= 3 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--accent)';
                return (
                  <div key={exam._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    gap: 12,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-primary)', lineHeight: 1.2 }}>
                        {exam.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 3, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        {exam.subject?.code ? `${exam.subject.code} · ` : ''}{exam.subject?.name || ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>
                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1 }}>
                        {days <= 0 ? 'Today' : `${days}d`}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                        {days > 0 ? 'countdown' : 'exam day'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Subject-Wise Attendance Health & Recovery Guidance ── */}
        <div className="card dashboard-grid-wide" style={{ marginTop: 'var(--s2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Academic Health Monitor
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800 }}>Subject-Wise Attendance & Recovery Guidance</h3>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate('records')}
              id="dash-view-records"
              style={{ fontSize: 12, gap: 4 }}
            >
              Academic Records <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>

          {subjectsSummary.length === 0 ? (
            <div style={{
              padding: '28px 16px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 4,
            }}>
              <BookOpen size={24} style={{ color: 'var(--fg-muted)', marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-primary)' }}>No Enrolled Subjects</div>
              <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '4px 0 14px' }}>
                Add your curriculum subjects to track class attendance health and recovery guidance.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('subjects')}
              >
                + Add Subjects
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
            }}>
              {subjectsSummary.map((subj) => {
                const isShortage = subj.totalClasses > 0 && subj.attendancePct < subj.attendanceThreshold;
                const statusColor = subj.totalClasses === 0
                  ? 'var(--fg-muted)'
                  : isShortage
                  ? 'var(--danger)'
                  : subj.attendancePct >= subj.attendanceThreshold + 5
                  ? 'var(--success)'
                  : 'var(--warning)';

                return (
                  <div
                    key={subj._id}
                    style={{
                      padding: '14px 16px',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${statusColor}`,
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 2,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--fg-faint)',
                          letterSpacing: '0.04em',
                        }}>
                          {subj.code}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          fontWeight: 800,
                          color: statusColor,
                        }}>
                          {subj.totalClasses > 0 ? `${subj.attendancePct}%` : 'No data'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg-primary)', lineHeight: 1.25 }}>
                        {subj.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                        {subj.attendedClasses} of {subj.totalClasses} classes attended (Target: {subj.attendanceThreshold}%)
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                      <ProgressBar
                        value={subj.attendancePct}
                        color={statusColor}
                      />
                      <div style={{
                        fontSize: 11,
                        color: isShortage ? 'var(--danger)' : 'var(--fg-secondary)',
                        marginTop: 6,
                        lineHeight: 1.35,
                      }}>
                        {subj.recoveryGuidance}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Refresh Footer ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'var(--s8)',
        paddingTop: 'var(--s6)',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
          CampusFlow Intelligence synchronized with live university attendance and local schedule.
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={load}
          id="btn-dashboard-refresh"
          style={{ gap: 6 }}
        >
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          <span>Sync Workspace</span>
        </button>
      </div>
    </div>
  );
}

