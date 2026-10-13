import React, { useState, useEffect } from 'react';
import { intelligenceAPI } from '../services/api';
import { LoadingState, ErrorState, StatCard, SectionHeader, AcademicHealthRing, ProgressBar } from '../components/SharedComponents';
import { getGreeting, deadlineLabel, getPriorityBadgeClass } from '../utils/helpers';
import { RefreshCw, AlertTriangle, ArrowRight, BookOpen, CheckSquare, FileText, Activity } from 'lucide-react';

function DashboardPage({ onNavigate }) {
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

  if (loading) return <LoadingState message="Loading dashboard…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!data)   return null;

  // ── FIELD MAPPING (matches intelligenceController.js response) ──
  // data.summary       → stat counts
  // data.todaysFocus   → prioritized tasks (top 5)
  // data.academicAlerts → at-risk subjects
  // data.upcomingExams → upcoming exams
  // data.conflicts     → deadline conflicts
  // data.academicHealth → 0-100 score
  const {
    user,
    academicHealth = 0,
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

  // Avg attendance from academicAlerts (subjects with attendance info)
  const avgAttendance = academicAlerts.length > 0
    ? Math.round(academicAlerts.reduce((s, r) => s + (r.attendance?.currentPct || 0), 0) / academicAlerts.length)
    : 85;

  return (
    <div className="page-container">
      {/* GREETING */}
      <div className="dash-greeting">
        <h1>{getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}.</h1>
        <p className="dash-greeting-sub" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* CONFLICT BANNER */}
      {conflicts?.length > 0 && (
        <div className="conflict-banner" role="alert">
          <div className="conflict-banner-title">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            Deadline Conflict Detected
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>
            {conflicts[0].message || conflicts[0].description || 'Multiple deadlines overlap this week.'}
          </div>
        </div>
      )}

      {/* STATS GRID */}
      <div className="stats-grid" role="region" aria-label="Academic statistics">
        <StatCard label="Subjects"       value={totalSubjects}      icon={<BookOpen size={14} strokeWidth={1.5} />} />
        <StatCard label="Pending Tasks"  value={pendingTasks}       accentColor="var(--warning)"  icon={<CheckSquare size={14} strokeWidth={1.5} />} />
        <StatCard label="Upcoming Exams" value={upcomingExamsCount} accentColor="var(--accent)"   icon={<FileText size={14} strokeWidth={1.5} />} />
        <StatCard label="At Risk"        value={highRiskSubjects}
          accentColor={highRiskSubjects > 0 ? 'var(--danger)' : 'var(--success)'}
          icon={<Activity size={14} strokeWidth={1.5} />}
          detail={highRiskSubjects > 0 ? 'Needs attention' : 'All clear'} />
      </div>

      <div className="dashboard-grid">

        {/* ── Academic Health ── */}
        <div className="card">
          <SectionHeader overline="Intelligence" title="Academic Health" />
          <AcademicHealthRing score={academicHealth} size={120} />
          <div style={{ marginTop: 'var(--s6)' }}>
            <div style={{ marginBottom: 'var(--s4)' }}>
              <ProgressBar
                value={avgAttendance}
                color={avgAttendance >= 75 ? 'var(--success)' : avgAttendance >= 65 ? 'var(--warning)' : 'var(--danger)'}
                label="Attendance" />
            </div>
            <ProgressBar value={completionRate} color="var(--accent)" label="Task Completion" />
          </div>
        </div>

        {/* ── Priority Queue (todaysFocus) ── */}
        <div className="card">
          <SectionHeader overline="Priority Engine" title="Priority Queue">
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('tasks')} id="dash-view-tasks">
              All Tasks <ArrowRight size={11} aria-hidden="true" />
            </button>
          </SectionHeader>
          {todaysFocus.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No pending tasks. You're clear.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {todaysFocus.slice(0, 5).map((task) => (
                <div key={task._id} className={`priority-card priority-card-${(task.priorityLevel || 'MEDIUM').toLowerCase()}`}>
                  <div className="priority-card-header">
                    <div>
                      <div className="priority-card-title">{task.title}</div>
                      {task.subject && (
                        <div className="priority-card-subject" style={{ fontFamily: 'var(--font-mono)' }}>{task.subject.name || task.subject.code}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800,
                        lineHeight: 1, letterSpacing: '-0.01em',
                        color: task.priorityLevel === 'HIGH' ? 'var(--danger)' : task.priorityLevel === 'MEDIUM' ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {task.priorityScore || '—'}
                      </div>
                      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>score</div>
                    </div>
                  </div>
                  <div className="priority-card-meta">
                    <span className="priority-card-meta-item" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{deadlineLabel(task.deadline)}</span>
                    <span className={getPriorityBadgeClass(task.priorityLevel)} style={{ fontFamily: 'var(--font-mono)' }}>{task.priorityLevel}</span>
                  </div>
                  {task.priorityExplanation && (
                    <div className="priority-explanation">{task.priorityExplanation}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Academic Alerts (risk subjects) ── */}
        <div className="card">
          <SectionHeader overline="Risk Detection" title="At-Risk Subjects">
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('subjects')} id="dash-view-subjects">
              All <ArrowRight size={11} aria-hidden="true" />
            </button>
          </SectionHeader>
          {academicAlerts.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, background: 'var(--success)', display: 'inline-block' }} aria-hidden="true" />
              All subjects are in safe territory.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {academicAlerts.map((subj) => {
                const attPct = subj.attendance?.currentPct || 0;
                const color  = subj.riskLevel === 'HIGH' ? 'var(--danger)' : 'var(--warning)';
                return (
                  <div key={subj._id} style={{
                    padding: 'var(--s4) var(--s5)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${color}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--s2)' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, textTransform: 'uppercase', color: 'var(--fg-primary)', lineHeight: 1 }}>
                          {subj.subjectName || subj.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{subj.subjectCode || subj.code}</div>
                      </div>
                      <span className={`badge badge-${subj.riskLevel === 'HIGH' ? 'high' : 'medium'}`} style={{ fontFamily: 'var(--font-mono)' }}>{subj.riskLevel}</span>
                    </div>
                    <ProgressBar value={attPct} color={color} label={`Attendance: ${attPct}%`} />
                    {subj.riskFactors?.[0] && (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 'var(--s2)', fontStyle: 'italic' }}>
                        {subj.riskFactors[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming Exams ── */}
        <div className="card">
          <SectionHeader overline="Upcoming" title="Exams">
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('exams')} id="dash-view-exams">
              All <ArrowRight size={11} aria-hidden="true" />
            </button>
          </SectionHeader>
          {upcomingExams.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>No upcoming exams in the next 14 days.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              {upcomingExams.slice(0, 4).map((exam) => {
                const days = Math.ceil((new Date(exam.date) - new Date()) / 86400000);
                const color = days <= 3 ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--success)';
                return (
                  <div key={exam._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--s3) var(--s4)', border: '1px solid var(--border)', gap: 'var(--s4)',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-primary)', lineHeight: 1.2 }}>{exam.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        {exam.subject?.name || exam.subject?.code || ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {days <= 0 ? 'Today' : `${days}d`}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--fg-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                        {days > 0 ? 'remaining' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--s8)', paddingTop: 'var(--s6)', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-secondary btn-sm" onClick={load} id="btn-dashboard-refresh">
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          Refresh Dashboard
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
