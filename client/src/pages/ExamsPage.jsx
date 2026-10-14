import React, { useState, useEffect } from 'react';
import { examsAPI, subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal } from '../components/SharedComponents';
import {
  FileText, Plus, Edit2, Trash2, Calendar, Clock,
  AlertTriangle, CheckCircle2, AlertCircle
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard', 'Very Hard'];
const STATUS_OPTIONS     = ['Upcoming', 'Completed', 'Cancelled'];
const EXAM_FILTER_TABS   = ['All', 'Upcoming', 'Completed'];

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

function ExamForm({ subjects, initial, onSave, onCancel, saving }) {
  const [f, setF] = useState(initial ? {
    name:        initial.name || '',
    subject:     initial.subject?._id || initial.subject || '',
    date:        initial.date ? initial.date.slice(0, 10) : '',
    difficulty:  initial.difficulty || 'Medium',
    totalMarks:  initial.totalMarks || 100,
    targetScore: initial.targetScore || 75,
    duration:    initial.duration || 180,
    syllabus:    Array.isArray(initial.syllabus) ? initial.syllabus.join(', ') : (initial.syllabus || ''),
    notes:       initial.notes || '',
    status:      initial.status || 'Upcoming',
  } : {
    name: '', subject: '', date: '', difficulty: 'Medium',
    totalMarks: 100, targetScore: 75, duration: 180, syllabus: '', notes: '', status: 'Upcoming',
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const errs = {};
    if (!f.name.trim()) errs.name = 'Exam title is required.';
    if (!f.subject)     errs.subject = 'Please select a subject.';
    if (!f.date)        errs.date = 'Exam date is required.';
    else {
      const d = new Date(f.date);
      if (isNaN(d.getTime())) errs.date = 'Please enter a valid calendar date.';
    }
    if (f.totalMarks < 1 || f.totalMarks > 1000) errs.totalMarks = 'Total marks must be 1–1000.';
    if (f.targetScore < 0 || f.targetScore > 100) errs.targetScore = 'Target score must be 0–100%.';
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      ...f,
      name: f.name.trim(),
      syllabus: f.syllabus.split(',').map(s => s.trim()).filter(Boolean),
      totalMarks:  Number(f.totalMarks),
      targetScore: Number(f.targetScore),
      duration:    Number(f.duration),
    });
  };

  return (
    <form onSubmit={submit} noValidate id="form-exam">
      <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-name">Exam Title <span className="required" aria-hidden="true">*</span></label>
        <input
          id="exam-name"
          className={`form-input ${errors.name ? 'input-error' : ''}`}
          value={f.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Mid-Semester Examination"
          required
        />
        <FieldError msg={errors.name} />
      </div>

      <div className={`form-group ${errors.subject ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-subject">Subject <span className="required" aria-hidden="true">*</span></label>
        <select
          id="exam-subject"
          className={`form-select ${errors.subject ? 'input-error' : ''}`}
          value={f.subject}
          onChange={e => set('subject', e.target.value)}
          required
        >
          <option value="">— Select Subject —</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        <FieldError msg={errors.subject} />
        {subjects.length === 0 && <div className="field-hint">Add subjects first in curriculum to link an exam.</div>}
      </div>

      <div className={`form-group ${errors.date ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-date">Exam Date <span className="required" aria-hidden="true">*</span></label>
        <input
          id="exam-date"
          type="date"
          className={`form-input ${errors.date ? 'input-error' : ''}`}
          value={f.date}
          onChange={e => set('date', e.target.value)}
          required
        />
        <FieldError msg={errors.date} />
      </div>

      <div className="form-row">
        <div className={`form-group ${errors.totalMarks ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="exam-marks">Total Marks</label>
          <input
            id="exam-marks"
            type="number"
            className={`form-input ${errors.totalMarks ? 'input-error' : ''}`}
            value={f.totalMarks}
            onChange={e => set('totalMarks', e.target.value)}
            min={1}
            max={1000}
          />
          <FieldError msg={errors.totalMarks} />
        </div>
        <div className={`form-group ${errors.targetScore ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="exam-target">Target Score (%)</label>
          <input
            id="exam-target"
            type="number"
            className={`form-input ${errors.targetScore ? 'input-error' : ''}`}
            value={f.targetScore}
            onChange={e => set('targetScore', e.target.value)}
            min={0}
            max={100}
          />
          <FieldError msg={errors.targetScore} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="exam-difficulty">Difficulty Level</label>
          <select id="exam-difficulty" className="form-select" value={f.difficulty} onChange={e => set('difficulty', e.target.value)}>
            {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="exam-status">Status</label>
          <select id="exam-status" className="form-select" value={f.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="exam-syllabus">Syllabus / Units Covered <span className="field-hint-inline">(comma-separated)</span></label>
        <textarea
          id="exam-syllabus"
          className="form-textarea"
          rows={2}
          value={f.syllabus}
          onChange={e => set('syllabus', e.target.value)}
          placeholder="e.g. Unit 1: Arrays & Stacks, Unit 2: Trees & Graphs"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="exam-notes">Preparation Notes</label>
        <textarea
          id="exam-notes"
          className="form-textarea"
          rows={2}
          value={f.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Formulas to review, previous question paper focus…"
        />
      </div>

      <div className="modal-footer" style={{ marginTop: 'var(--s6)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving} id="btn-save-exam">
          {saving ? 'Saving…' : (initial ? 'Update Exam' : 'Schedule Exam')}
        </button>
      </div>
    </form>
  );
}

export default function ExamsPage() {
  const { toast } = useToast();
  const [exams, setExams]       = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('All');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [er, sr] = await Promise.all([examsAPI.getAll(), subjectsAPI.getAll()]);
      setExams(er.data || []);
      setSubjects(sr.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (modal.type === 'add') {
        const res = await examsAPI.create(formData);
        setExams(p => [...p, res.data].sort((a, b) => new Date(a.date) - new Date(b.date)));
        toast.success(`Exam "${res.data.name}" scheduled.`);
      } else {
        const res = await examsAPI.update(modal.exam._id, formData);
        setExams(p => p.map(e => e._id === res.data._id ? res.data : e));
        toast.success(`Exam "${res.data.name}" updated.`);
      }
      setModal(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save exam.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setSaving(true);
    try {
      await examsAPI.delete(id);
      setExams(p => p.filter(e => e._id !== id));
      toast.success(`Exam "${name}" removed from calendar.`);
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete exam.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading examination schedule…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const now        = new Date();
  const upcoming   = exams.filter(e => e.status === 'Upcoming' && new Date(e.date) >= now);
  const past       = exams.filter(e => e.status !== 'Upcoming' || new Date(e.date) < now);
  const nextExam   = upcoming[0];
  const daysToNext = nextExam ? Math.ceil((new Date(nextExam.date) - now) / 86400000) : null;

  const filteredExams = filter === 'All'
    ? exams
    : filter === 'Upcoming'
      ? upcoming
      : past;

  return (
    <div className="page-container">
      {/* ── UNIFIED PAGE HEADER ── */}
      <div className="page-header">
        <div className="page-header-text">
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: 4,
          }}>
            Examination Timeline
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Exams
            <span style={{
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '2px 10px',
              color: 'var(--fg-secondary)',
            }}>
              {upcoming.length} upcoming
            </span>
          </h1>
          <p>
            Scheduled examinations, internal tests, target benchmark scores, and conflict monitoring.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal({ type: 'add' })}
          id="btn-add-exam"
          style={{ gap: 6 }}
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          <span>Schedule Exam</span>
        </button>
      </div>

      {/* ── METRIC STRIP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 'var(--s3)',
        marginBottom: 'var(--s6)',
      }}>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Total Scheduled</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem' }}>{exams.length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Upcoming</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>{upcoming.length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--success)' }}>
            {past.filter(e => e.status === 'Completed').length}
          </div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Next Exam Countdown</div>
          <div className="stat-card-value" style={{
            fontSize: '1.6rem',
            color: daysToNext != null && daysToNext <= 3 ? 'var(--danger)' : 'var(--fg-primary)',
          }}>
            {daysToNext != null ? (daysToNext === 0 ? 'Today' : `${daysToNext}d`) : '—'}
          </div>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 'var(--s6)',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 2,
        }}
        role="tablist"
        aria-label="Filter exams by timeline"
      >
        {EXAM_FILTER_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            onClick={() => setFilter(tab)}
            id={`filter-exam-${tab.toLowerCase()}`}
            style={{
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: filter === tab ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: `2px solid ${filter === tab ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -3,
              background: 'none',
              cursor: 'pointer',
              transition: 'all var(--t-fast)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab}
            <span style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              padding: '1px 5px',
              borderRadius: 3,
              background: filter === tab ? 'var(--accent-dim)' : 'var(--bg-elevated)',
              color: filter === tab ? 'var(--accent)' : 'var(--fg-faint)',
            }}>
              {tab === 'All' ? exams.length : tab === 'Upcoming' ? upcoming.length : past.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── EXAM CARDS ── */}
      {filteredExams.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.8} />}
          title={filter === 'All' ? 'No Exams Scheduled' : `No ${filter} Exams`}
          description={
            filter === 'All'
              ? 'Schedule midterm assessments or final semester exams to calculate revision intervals and conflict alerts.'
              : `There are currently no exams in the "${filter}" category.`
          }
          action={
            filter === 'All' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ type: 'add' })}
                id="btn-empty-add-exam"
              >
                Schedule First Exam
              </button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredExams.map((exam) => {
            const days = Math.ceil((new Date(exam.date) - now) / 86400000);
            const isPast    = new Date(exam.date) < now || exam.status !== 'Upcoming';
            const isUrgent  = !isPast && days <= 3;
            const borderColor = isPast
              ? 'var(--border)'
              : isUrgent
                ? 'var(--danger)'
                : days <= 7
                  ? 'var(--warning)'
                  : 'var(--accent)';

            return (
              <div
                key={exam._id}
                className="card"
                style={{
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${borderColor}`,
                  padding: '18px 22px',
                  background: isPast ? 'var(--bg-surface)' : 'var(--card)',
                  opacity: isPast ? 0.75 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: 'var(--fg-primary)',
                        margin: 0,
                        lineHeight: 1.2,
                      }}>
                        {exam.name}
                      </h3>
                      <span className={`badge ${exam.status === 'Completed' ? 'badge-low' : exam.status === 'Cancelled' ? 'badge-neutral' : 'badge-medium'}`}>
                        {exam.status}
                      </span>
                    </div>

                    <div style={{
                      fontSize: 12.5,
                      color: 'var(--fg-muted)',
                      display: 'flex',
                      gap: 10,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                        {exam.subject?.name ? `${exam.subject.name} (${exam.subject.code || ''})` : '—'}
                      </span>
                      <span style={{ color: 'var(--border-strong)' }}>•</span>
                      <span>{formatDate(exam.date)}</span>
                      <span style={{ color: 'var(--border-strong)' }}>•</span>
                      <span>{exam.totalMarks} Marks</span>
                      {exam.difficulty && (
                        <>
                          <span style={{ color: 'var(--border-strong)' }}>•</span>
                          <span>{exam.difficulty}</span>
                        </>
                      )}
                    </div>

                    {exam.syllabus?.length > 0 && (
                      <div style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: 'var(--fg-secondary)',
                        lineHeight: 1.5,
                      }}>
                        <strong style={{ color: 'var(--fg-muted)' }}>Syllabus:</strong> {exam.syllabus.join(' · ')}
                      </div>
                    )}
                  </div>

                  {/* Countdown / Score & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {!isPast && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          lineHeight: 1,
                          color: borderColor,
                        }}>
                          {days <= 0 ? 'Today' : `${days}d`}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                          remaining
                        </div>
                      </div>
                    )}

                    {isPast && exam.actualScore != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          color: exam.actualScore >= exam.targetScore ? 'var(--success)' : 'var(--danger)',
                          lineHeight: 1,
                        }}>
                          {exam.actualScore}%
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                          scored
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setModal({ type: 'edit', exam })}
                        id={`btn-edit-exam-${exam._id}`}
                        aria-label={`Edit ${exam.name}`}
                        style={{ padding: 6, color: 'var(--fg-muted)' }}
                      >
                        <Edit2 size={13} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDeleteConfirm({ id: exam._id, name: exam.name })}
                        id={`btn-del-exam-${exam._id}`}
                        aria-label={`Delete ${exam.name}`}
                        style={{ padding: 6, color: 'var(--fg-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer notes & targets */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 11.5,
                  color: 'var(--fg-faint)',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  <span>Target Benchmark: {exam.targetScore}%</span>
                  {exam.notes && <span style={{ fontStyle: 'italic', maxWidth: 400 }}>Note: {exam.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Schedule Examination' : 'Edit Exam Details'}
      >
        <ExamForm
          subjects={subjects}
          initial={modal?.exam}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          saving={saving}
        />
      </Modal>

      {/* Custom Deletion Confirmation Dialog (No window.confirm) */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Exam?"
      >
        <div style={{ padding: '8px 0 16px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 4,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong style={{ color: 'var(--fg-primary)' }}>"{deleteConfirm?.name}"</strong> from your calendar?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-faint)' }}>
                This will remove the event from countdowns and conflict monitoring.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={confirmDelete}
              disabled={saving}
              style={{
                background: 'var(--danger)',
                borderColor: 'var(--danger)',
                color: '#FFFFFF',
                fontWeight: 700,
              }}
            >
              {saving ? 'Removing…' : 'Remove Exam'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

