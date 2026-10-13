import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, SectionHeader, ProgressBar } from '../components/SharedComponents';
import { CheckSquare, X, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { getAttendanceInfo, formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

function AttendancePage() {
  const { toast } = useToast();
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [marking, setMarking]     = useState({}); // subjectId → 'PRESENT'|'ABSENT'|null (loading state)
  const [expanded, setExpanded]   = useState({}); // subjectId → bool (history open)
  const [history, setHistory]     = useState({}); // subjectId → sessions[]

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await attendanceAPI.getSubjects();
      setSubjects((res.data || []).filter(s => s.isActive !== false));
    } catch (err) {
      setError(err.message || 'Failed to load attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Mark attendance for a subject on TODAY
  const handleMark = async (subject, status) => {
    if (marking[subject._id]) return; // prevent double-tap
    setMarking(p => ({ ...p, [subject._id]: status }));
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await attendanceAPI.mark(subject._id, { status, date: today });
      // Update subject in list with new totals from server
      setSubjects(prev => prev.map(s =>
        s._id === subject._id
          ? { ...s, ...res.data.subject }
          : s
      ));
      toast.success(`${status === 'PRESENT' ? 'Present' : 'Absent'} marked for ${subject.name}.`);
    } catch (err) {
      if (err.status === 409) {
        toast.warning('Attendance already recorded for today. Use history to correct it.');
      } else {
        toast.error(err.message || 'Failed to mark attendance.');
      }
    } finally {
      setMarking(p => ({ ...p, [subject._id]: null }));
    }
  };

  // Load session history for a subject
  const loadHistory = async (subjectId) => {
    if (history[subjectId]) {
      // already loaded — just toggle
      setExpanded(p => ({ ...p, [subjectId]: !p[subjectId] }));
      return;
    }
    try {
      const res = await attendanceAPI.history(subjectId, { limit: 20 });
      setHistory(p => ({ ...p, [subjectId]: res.data.sessions }));
      setExpanded(p => ({ ...p, [subjectId]: true }));
    } catch (err) {
      toast.error('Failed to load attendance history.');
    }
  };

  // Correct a past session
  const handleCorrect = async (subjectId, sessionId, newStatus, subjectName) => {
    try {
      const res = await attendanceAPI.correct(subjectId, sessionId, { status: newStatus });
      // Update session in history
      setHistory(p => ({
        ...p,
        [subjectId]: (p[subjectId] || []).map(s => s._id === sessionId ? { ...s, status: newStatus } : s),
      }));
      // Update subject totals
      setSubjects(prev => prev.map(s =>
        s._id === subjectId ? { ...s, ...res.data.subject } : s
      ));
      toast.success(`Attendance corrected to ${newStatus} for ${subjectName}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to correct attendance.');
    }
  };

  if (loading) return <LoadingState message="Loading attendance…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const safeSubjects = subjects.filter(Boolean);
  const criticalCount = safeSubjects.filter(s => {
    const info = getAttendanceInfo(s.attendedClasses, s.totalClasses, s.attendanceThreshold);
    return info.status === 'CRITICAL';
  }).length;

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Attendance</h1>
          <p>Cumulative per-session tracking — every class counts.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load} id="btn-refresh-attendance">
          <RefreshCw size={12} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {/* Today's date + summary */}
      <div style={{ display: 'flex', gap: 'var(--s6)', marginBottom: 'var(--s8)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 2, fontFamily: 'var(--font-mono)' }}>Today</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--fg-primary)', letterSpacing: '-0.01em' }}>{todayStr}</div>
        </div>
        {criticalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.06)' }}>
            <div style={{ width: 6, height: 6, background: 'var(--danger)' }} aria-hidden="true" />
            <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>
              {criticalCount} subject{criticalCount > 1 ? 's' : ''} below attendance threshold
            </span>
          </div>
        )}
      </div>

      {/* How it works callout */}
      <div style={{ padding: 'var(--s4) var(--s5)', border: '1px solid var(--border)', background: 'var(--bg-surface)', marginBottom: 'var(--s8)', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.8 }}>
        <strong style={{ color: 'var(--fg-primary)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em' }}>How attendance works:</strong>
        {' '}Mark each class as <strong>Present</strong> (+1 attended, +1 total) or <strong>Absent</strong> (+1 total only).
        One session per subject per day. Use <strong>History</strong> to view or correct past sessions.
      </div>

      {safeSubjects.length === 0 ? (
        <EmptyState icon={<CheckSquare size={22} strokeWidth={1.5} />} title="No Subjects Found"
          description="Add subjects first to start tracking attendance." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          {safeSubjects.map((subject) => {
            const info       = getAttendanceInfo(subject.attendedClasses, subject.totalClasses, subject.attendanceThreshold);
            const isMarking  = !!marking[subject._id];
            const isExpanded = expanded[subject._id];
            const sessHistory = history[subject._id] || [];

            return (
              <div key={subject._id} style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                {/* Subject row */}
                <div style={{ padding: 'var(--s5) var(--s6)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s4)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', marginBottom: 'var(--s2)' }}>
                        <div style={{ width: 3, height: 20, background: subject.color || info.color, flexShrink: 0 }} aria-hidden="true" />
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--fg-primary)', lineHeight: 1 }}>
                          {subject.name}
                        </div>
                        <span className={`badge ${info.status === 'SAFE' ? 'badge-low' : info.status === 'WARNING' ? 'badge-medium' : 'badge-high'}`}>
                          {info.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginLeft: 'var(--s5)' }}>{subject.code}</div>
                    </div>

                    {/* Attendance count + percentage */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: info.color }}>
                        {info.pct}%
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
                        {subject.attendedClasses} / {subject.totalClasses} classes
                      </div>
                      {subject.totalClasses > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--fg-faint)', marginTop: 1 }}>
                          threshold: {subject.attendanceThreshold}%
                        </div>
                      )}
                    </div>
                  </div>

                  <ProgressBar value={info.pct} color={info.color} style={{ margin: 'var(--s4) 0' }} />

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 'var(--s3)', marginTop: 'var(--s4)', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm"
                      disabled={isMarking}
                      onClick={() => handleMark(subject, 'PRESENT')}
                      id={`btn-present-${subject._id}`}
                      aria-label={`Mark present for ${subject.name}`}
                      style={{ background: 'var(--success)', color: '#080808', fontWeight: 800, minWidth: 100, opacity: isMarking ? 0.6 : 1 }}>
                      {isMarking && marking[subject._id] === 'PRESENT' ? <><span className="spinner" aria-hidden="true" />Marking…</> : (
                        <><CheckSquare size={12} aria-hidden="true" /> Present</>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isMarking}
                      onClick={() => handleMark(subject, 'ABSENT')}
                      id={`btn-absent-${subject._id}`}
                      aria-label={`Mark absent for ${subject.name}`}
                      style={{ opacity: isMarking ? 0.6 : 1 }}>
                      {isMarking && marking[subject._id] === 'ABSENT' ? <><span className="spinner" aria-hidden="true" />Marking…</> : (
                        <><X size={12} aria-hidden="true" /> Absent</>
                      )}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => loadHistory(subject._id)}
                      id={`btn-history-${subject._id}`}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Hide' : 'View'} history for ${subject.name}`}>
                      <Clock size={11} aria-hidden="true" />
                      History
                      {isExpanded ? <ChevronUp size={11} aria-hidden="true" /> : <ChevronDown size={11} aria-hidden="true" />}
                    </button>
                  </div>

                  {/* Classes-needed warning */}
                  {subject.totalClasses > 0 && info.status !== 'SAFE' && (
                    <div style={{ marginTop: 'var(--s4)', fontSize: 12, color: info.color, fontWeight: 600 }}>
                      {info.status === 'CRITICAL'
                        ? `⚠ You need to attend ${subject.classesNeededForThreshold || '?'} more consecutive classes to reach ${subject.attendanceThreshold}%.`
                        : `Near threshold — attend next class to maintain ${subject.attendanceThreshold}% requirement.`}
                    </div>
                  )}
                </div>

                {/* Attendance history panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--s5) var(--s6)', background: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 'var(--s4)' }}>
                      Session History (last 20)
                    </div>
                    {sessHistory.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>No sessions recorded yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {sessHistory.map((sess) => (
                          <div key={sess._id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '6px 0', borderBottom: '1px solid var(--border)',
                          }}>
                            <div style={{ display: 'flex', gap: 'var(--s4)', alignItems: 'center' }}>
                              <div style={{ width: 8, height: 8, background: sess.status === 'PRESENT' ? 'var(--success)' : 'var(--danger)' }} aria-hidden="true" />
                              <span style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{formatDate(sess.date)}</span>
                              {sess.correctedFrom && (
                                <span style={{ fontSize: 10, color: 'var(--fg-faint)', fontStyle: 'italic' }}>
                                  corrected from {sess.correctedFrom}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: sess.status === 'PRESENT' ? 'var(--success)' : 'var(--danger)', letterSpacing: '0.04em' }}>
                                {sess.status}
                              </span>
                              {/* Correct button */}
                              <button
                                style={{ fontSize: 10, padding: '2px 8px', border: '1px solid var(--border)', background: 'none', color: 'var(--fg-faint)', cursor: 'pointer', letterSpacing: '0.06em' }}
                                onClick={() => handleCorrect(subject._id, sess._id, sess.status === 'PRESENT' ? 'ABSENT' : 'PRESENT', subject.name)}
                                id={`btn-correct-${sess._id}`}
                                aria-label={`Change to ${sess.status === 'PRESENT' ? 'Absent' : 'Present'}`}>
                                Correct
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AttendancePage;
