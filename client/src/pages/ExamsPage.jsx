import React, { useState, useEffect } from 'react';
import { examsAPI, subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal, SectionHeader } from '../components/SharedComponents';
import { FileText, Plus, Edit2, Trash2, ChevronUp } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard', 'Very Hard'];
const STATUS_OPTIONS     = ['Upcoming', 'Completed', 'Cancelled'];

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

// NOTE: Backend exam field is `name` (not `title`)
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
    if (!f.name.trim())    errs.name    = 'Exam name is required.';
    if (!f.subject)        errs.subject = 'Please select a subject.';
    if (!f.date)           errs.date    = 'Exam date is required.';
    else {
      const d = new Date(f.date);
      if (isNaN(d.getTime())) errs.date = 'Please enter a valid date.';
    }
    if (f.totalMarks < 1 || f.totalMarks > 1000) errs.totalMarks = 'Total marks must be 1–1000.';
    if (f.targetScore < 0 || f.targetScore > 100) errs.targetScore = 'Target score must be 0–100.';
    return errs;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave({
      ...f,
      syllabus: f.syllabus.split(',').map(s => s.trim()).filter(Boolean),
      totalMarks:  Number(f.totalMarks),
      targetScore: Number(f.targetScore),
      duration:    Number(f.duration),
    });
  };

  return (
    <form onSubmit={submit} noValidate id="form-exam">
      {/* Exam Name */}
      <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-name">Exam Name <span className="required" aria-hidden="true">*</span></label>
        <input id="exam-name" className={`form-input ${errors.name ? 'input-error' : ''}`}
          value={f.name} onChange={e => set('name', e.target.value)} placeholder="Mid-Semester Examination" required />
        <FieldError msg={errors.name} />
      </div>

      {/* Subject */}
      <div className={`form-group ${errors.subject ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-subject">Subject <span className="required" aria-hidden="true">*</span></label>
        <select id="exam-subject" className={`form-select ${errors.subject ? 'input-error' : ''}`}
          value={f.subject} onChange={e => set('subject', e.target.value)} required>
          <option value="">— Select Subject —</option>
          {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        <FieldError msg={errors.subject} />
        {subjects.length === 0 && <div className="field-hint">Add subjects first to link an exam.</div>}
      </div>

      {/* Date */}
      <div className={`form-group ${errors.date ? 'has-error' : ''}`}>
        <label className="form-label" htmlFor="exam-date">Exam Date <span className="required" aria-hidden="true">*</span></label>
        <input id="exam-date" type="date" className={`form-input ${errors.date ? 'input-error' : ''}`}
          value={f.date} onChange={e => set('date', e.target.value)} required />
        <FieldError msg={errors.date} />
      </div>

      <div className="form-row">
        <div className={`form-group ${errors.totalMarks ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="exam-marks">Total Marks</label>
          <input id="exam-marks" type="number" className={`form-input ${errors.totalMarks ? 'input-error' : ''}`}
            value={f.totalMarks} onChange={e => set('totalMarks', e.target.value)} min={1} max={1000} />
          <FieldError msg={errors.totalMarks} />
        </div>
        <div className={`form-group ${errors.targetScore ? 'has-error' : ''}`}>
          <label className="form-label" htmlFor="exam-target">Target %</label>
          <input id="exam-target" type="number" className={`form-input ${errors.targetScore ? 'input-error' : ''}`}
            value={f.targetScore} onChange={e => set('targetScore', e.target.value)} min={0} max={100} />
          <FieldError msg={errors.targetScore} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="exam-difficulty">Difficulty</label>
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
        <label className="form-label" htmlFor="exam-syllabus">Syllabus / Topics <span className="field-hint-inline">(comma-separated)</span></label>
        <textarea id="exam-syllabus" className="form-textarea" rows={2}
          value={f.syllabus} onChange={e => set('syllabus', e.target.value)}
          placeholder="Unit 1: Arrays, Unit 2: Linked Lists, Unit 3: Trees" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="exam-notes">Notes</label>
        <textarea id="exam-notes" className="form-textarea" rows={2}
          value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Preparation notes…" />
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving} id="btn-save-exam">
          {saving ? <><span className="spinner" aria-hidden="true" />Saving…</> : (initial ? 'Update Exam' : 'Add Exam')}
        </button>
      </div>
    </form>
  );
}

function ExamsPage() {
  const { toast } = useToast();
  const [exams, setExams]       = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);
  const [saving, setSaving]     = useState(false);

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
        toast.success('Exam added successfully.');
      } else {
        const res = await examsAPI.update(modal.exam._id, formData);
        setExams(p => p.map(e => e._id === res.data._id ? res.data : e));
        toast.success('Exam updated.');
      }
      setModal(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save exam.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove exam "${name}"?`)) return;
    try {
      await examsAPI.delete(id);
      setExams(p => p.filter(e => e._id !== id));
      toast.success('Exam removed.');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingState message="Loading exams…" />;
  if (error)   return <ErrorState message={error} onRetry={() => { setLoaded(false); setError(''); }} />;

  const now       = new Date();
  const upcoming  = exams.filter(e => e.status === 'Upcoming' && new Date(e.date) >= now);
  const past      = exams.filter(e => e.status !== 'Upcoming' || new Date(e.date) < now);
  const nextExam  = upcoming[0];
  const daysToNext = nextExam ? Math.ceil((new Date(nextExam.date) - now) / 86400000) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Exams</h1>
          <p>Track upcoming exams, set targets, and let the conflict engine flag overlaps.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-add-exam">
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          Add Exam
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 'var(--s6)', marginBottom: 'var(--s8)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',    value: exams.length,    color: 'var(--fg-primary)' },
          { label: 'Upcoming', value: upcoming.length,  color: 'var(--accent)' },
          { label: 'Done',     value: past.filter(e => e.status === 'Completed').length, color: 'var(--success)' },
          { label: 'Next Exam', value: daysToNext != null ? (daysToNext === 0 ? 'Today' : `${daysToNext}d`) : '—', color: daysToNext != null && daysToNext <= 3 ? 'var(--danger)' : 'var(--fg-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ paddingRight: 'var(--s6)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {exams.length === 0 ? (
        <EmptyState icon={<FileText size={22} strokeWidth={1.5} />} title="No Exams Scheduled"
          description="Add your upcoming exams to enable conflict detection and smart preparation planning."
          action={<button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-empty-add-exam">Schedule First Exam</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          {exams.map((exam) => {
            const days = Math.ceil((new Date(exam.date) - now) / 86400000);
            const isPast    = new Date(exam.date) < now || exam.status !== 'Upcoming';
            const isUrgent  = !isPast && days <= 3;
            const borderColor = isPast ? 'var(--border)' : isUrgent ? 'var(--danger)' : days <= 7 ? 'var(--warning)' : 'var(--success)';
            return (
              <div key={exam._id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${borderColor}`, padding: 'var(--s5) var(--s6)', background: 'var(--bg-elevated)', opacity: isPast ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s4)', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--fg-primary)', lineHeight: 1 }}>{exam.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4, display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>{exam.subject?.name || '—'}</span>
                      <span>·</span>
                      <span>{formatDate(exam.date)}</span>
                      <span>·</span>
                      <span>{exam.totalMarks} marks</span>
                      {exam.difficulty && <><span>·</span><span>{exam.difficulty}</span></>}
                    </div>
                    {exam.syllabus?.length > 0 && (
                      <div style={{ marginTop: 'var(--s3)', fontSize: 12, color: 'var(--fg-faint)' }}>
                        Topics: {exam.syllabus.join(' · ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s5)', flexShrink: 0 }}>
                    {!isPast && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: borderColor }}>
                          {days <= 0 ? 'Today' : `${days}d`}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>remaining</div>
                      </div>
                    )}
                    {isPast && exam.actualScore != null && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, color: exam.actualScore >= exam.targetScore ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                          {exam.actualScore}%
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>scored</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--s2)' }}>
                      <button className="subject-card-action-btn" onClick={() => setModal({ type: 'edit', exam })} id={`btn-edit-exam-${exam._id}`} aria-label={`Edit ${exam.name}`}><Edit2 size={11} /></button>
                      <button className="subject-card-action-btn danger" onClick={() => handleDelete(exam._id, exam.name)} id={`btn-del-exam-${exam._id}`} aria-label={`Delete ${exam.name}`}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', marginTop: 'var(--s4)', paddingTop: 'var(--s3)', borderTop: '1px solid var(--border)' }}>
                  <span className={`badge ${exam.status === 'Completed' ? 'badge-low' : exam.status === 'Cancelled' ? 'badge-neutral' : 'badge-medium'}`}>{exam.status}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>Target: {exam.targetScore}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Schedule Exam' : 'Edit Exam'}>
        <ExamForm subjects={subjects} initial={modal?.exam} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
      </Modal>
    </div>
  );
}

export default ExamsPage;
