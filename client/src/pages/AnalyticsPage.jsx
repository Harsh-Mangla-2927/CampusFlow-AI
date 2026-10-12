import React, { useState, useEffect } from 'react';
import { intelligenceAPI } from '../services/api';
import { LoadingState, ErrorState, SectionHeader, ProgressBar } from '../components/SharedComponents';
import { getHealthColor } from '../utils/helpers';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await intelligenceAPI.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Computing analytics…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;
  if (!analytics) return null;

  // Matches analyticsEngine.js computeFullAnalytics() return shape:
  // { academicHealth, subjectAnalytics, taskAnalytics, attendanceSummary, performanceTrend, examStats }
  const {
    academicHealth    = 0,
    subjectAnalytics  = [],
    taskAnalytics     = { total:0, completed:0, inProgress:0, pending:0, overdue:0, completionRate:0, upcomingThisWeek:0 },
    attendanceSummary = { average:0, safe:0, warning:0, critical:0 },
    performanceTrend  = [],
    examStats         = { total:0, upcoming:0, completed:0 },
  } = analytics;

  const healthColor = getHealthColor(academicHealth);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Analytics</h1>
          <p>Your academic performance at a glance — derived from real data.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => { setLoaded(false); setAnalytics(null); }} id="btn-refresh-analytics">
          <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 'var(--s8)' }}>
        {[
          { label: 'Academic Health',  value: `${academicHealth}%`,            color: healthColor },
          { label: 'Task Completion',  value: `${taskAnalytics.completionRate}%`, color: 'var(--accent)' },
          { label: 'Avg Attendance',   value: `${attendanceSummary.average}%`,    color: attendanceSummary.critical > 0 ? 'var(--danger)' : attendanceSummary.warning > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'Upcoming Exams',   value: examStats.upcoming,              color: 'var(--fg-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-elevated)', padding: 'var(--s6)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 'var(--s2)' }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">

        {/* Subject Breakdown */}
        <div className="card dashboard-grid-wide">
          <SectionHeader overline="Performance" title="Subject Breakdown" />
          {subjectAnalytics.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Add subjects to see analytics.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
              {subjectAnalytics.map((subject) => (
                <div key={subject.subjectId} style={{ paddingBottom: 'var(--s6)', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', minWidth: 0 }}>
                      <div style={{ width: 3, height: 32, background: subject.color || 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', color: 'var(--fg-primary)', letterSpacing: '0.02em', lineHeight: 1 }}>{subject.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{subject.code} · {subject.credits} cr.</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Tasks: {subject.taskStats.completed}/{subject.taskStats.total}</span>
                      <span className={`badge badge-${subject.attendanceStatus === 'SAFE' ? 'low' : subject.attendanceStatus === 'WARNING' ? 'medium' : 'high'}`}>{subject.attendanceStatus}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
                    <ProgressBar
                      value={subject.attendancePercentage}
                      color={subject.attendanceStatus === 'SAFE' ? 'var(--success)' : subject.attendanceStatus === 'WARNING' ? 'var(--warning)' : 'var(--danger)'}
                      label={`Attendance: ${subject.attendancePercentage}%`} />
                    <ProgressBar
                      value={subject.currentMarks}
                      color={subject.currentMarks >= subject.targetMarks ? 'var(--success)' : 'var(--accent)'}
                      label={`Marks: ${subject.currentMarks}% (Target: ${subject.targetMarks}%)`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Distribution */}
        <div className="card">
          <SectionHeader overline="Tasks" title="Task Overview" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
            {[
              { label: 'Completed',   value: taskAnalytics.completed,   color: 'var(--success)' },
              { label: 'In Progress', value: taskAnalytics.inProgress,   color: 'var(--accent)' },
              { label: 'Pending',     value: taskAnalytics.pending,      color: 'var(--warning)' },
              { label: 'Overdue',     value: taskAnalytics.overdue,      color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                    <div style={{ width: 3, height: 14, background: color }} aria-hidden="true" />
                    <span style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{label}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
                </div>
                <ProgressBar value={taskAnalytics.total > 0 ? (value / taskAnalytics.total) * 100 : 0} color={color} />
              </div>
            ))}
            <div style={{ marginTop: 'var(--s3)', paddingTop: 'var(--s3)', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--fg-muted)' }}>
              Due this week: <strong style={{ color: 'var(--fg-primary)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900 }}>{taskAnalytics.upcomingThisWeek}</strong>
            </div>
          </div>
        </div>

        {/* Marks Trends */}
        <div className="card">
          <SectionHeader overline="Trend Analysis" title="Marks Trends" />
          {performanceTrend.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Add at least 2 assessments per subject to see trends.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s6)' }}>
              {performanceTrend.map((subject) => {
                const scores = subject.trend.map(t => t.score);
                const first  = scores[0];
                const last   = scores[scores.length - 1];
                const diff   = last - first;
                const trendIcon  = diff > 0 ? <TrendingUp size={13} /> : diff < 0 ? <TrendingDown size={13} /> : <Minus size={13} />;
                const trendColor = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--fg-muted)';

                return (
                  <div key={subject.subjectCode} style={{ paddingBottom: 'var(--s5)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--s3)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, textTransform: 'uppercase', color: 'var(--fg-primary)', letterSpacing: '0.02em' }}>
                        {subject.subjectName}
                      </div>
                      <span style={{ fontSize: 12, color: trendColor, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {trendIcon} {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </div>
                    {/* Bar chart */}
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 48 }}>
                      {scores.map((score, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: i === scores.length - 1 ? 'var(--fg-primary)' : 'var(--fg-faint)' }}>{score}</span>
                          <div style={{ height: `${Math.max(6, score * 0.44)}px`, width: '100%', background: i === scores.length - 1 ? (diff >= 0 ? 'var(--accent)' : 'var(--danger)') : 'var(--bg-subtle)', transition: 'height 0.6s var(--ease)' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AnalyticsPage;
