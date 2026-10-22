import React, { useState, useEffect } from 'react';
import { subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal, ProgressBar } from '../components/SharedComponents';
import {
  BookOpen, Plus, Edit2, Trash2, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Award, AlertCircle
} from 'lucide-react';
import { useToast } from '../components/Toast';

const ACCENT_COLORS = [
  '#FF3D00', // CampusFlow Orange
  '#FF6B2B', // Coral
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#E2E8F0', // Neutral Silver
];

function SubjectForm({ initial, onSave, onCancel, loading }) {
  const [f, setF] = useState(
    initial || {
      name: '',
      code: '',
      teacher: '',
      credits: 3,
      attendanceThreshold: 75,
      targetMarks: 75,
      color: ACCENT_COLORS[0],
    }
  );
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name?.trim() || !f.code?.trim() || !f.credits) {
      setErr('Subject name, course code, and credits are required.');
      return;
    }
    onSave({
      ...f,
      name: f.name.trim(),
      code: f.code.trim().toUpperCase(),
      teacher: f.teacher?.trim() || '',
      credits: Number(f.credits),
      attendanceThreshold: Number(f.attendanceThreshold),
      targetMarks: Number(f.targetMarks),
    });
  };

  return (
    <form onSubmit={submit} noValidate id="form-subject">
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-name">Subject Name <span className="required">*</span></label>
          <input
            id="subj-name"
            className="form-input"
            value={f.name}
            onChange={e => set('name', e.target.value)}
            placeholder="e.g. Data Structures & Algorithms"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-code">Course Code <span className="required">*</span></label>
          <input
            id="subj-code"
            className="form-input"
            value={f.code}
            onChange={e => set('code', e.target.value)}
            placeholder="e.g. CS301"
            style={{ textTransform: 'uppercase' }}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-teacher">Instructor / Professor</label>
          <input
            id="subj-teacher"
            className="form-input"
            value={f.teacher}
            onChange={e => set('teacher', e.target.value)}
            placeholder="e.g. Dr. A. Sharma"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-credits">Credits <span className="required">*</span></label>
          <input
            id="subj-credits"
            type="number"
            className="form-input"
            value={f.credits}
            onChange={e => set('credits', Number(e.target.value))}
            min={1}
            max={10}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-att">Attendance Threshold (%)</label>
          <input
            id="subj-att"
            type="number"
            className="form-input"
            value={f.attendanceThreshold}
            onChange={e => set('attendanceThreshold', Number(e.target.value))}
            min={0}
            max={100}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-marks">Target Marks (%)</label>
          <input
            id="subj-marks"
            type="number"
            className="form-input"
            value={f.targetMarks}
            onChange={e => set('targetMarks', Number(e.target.value))}
            min={0}
            max={100}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Subject Accent Marker</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {ACCENT_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={`color-swatch${f.color === c ? ' selected' : ''}`}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: c,
                border: f.color === c ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                outline: f.color === c ? '2px solid var(--accent)' : 'none',
                cursor: 'pointer',
              }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>
      </div>
      <div className="modal-footer" style={{ marginTop: 'var(--s6)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} id="btn-cancel-subject">
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-subject">
          {loading ? 'Saving…' : (initial ? 'Update Subject' : 'Add Subject')}
        </button>
      </div>
    </form>
  );
}

function MarksForm({ subject, onSave, onCancel, loading }) {
  const [f, setF] = useState({ assessmentName: '', score: '' });
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (f.score === '' || isNaN(f.score)) { setErr('Score is required.'); return; }
    if (Number(f.score) < 0 || Number(f.score) > 100) { setErr('Score must be between 0 and 100.'); return; }
    onSave({ assessmentName: f.assessmentName.trim() || 'Internal Assessment', score: Number(f.score) });
  };

  return (
    <form onSubmit={submit} noValidate id="form-marks">
      <div style={{
        padding: '12px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        marginBottom: 'var(--s5)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Subject</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-primary)', marginTop: 2 }}>
          {subject.name} <span style={{ color: 'var(--accent)' }}>({subject.code})</span>
        </div>
      </div>
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-group" style={{ marginBottom: 'var(--s4)' }}>
        <label className="form-label" htmlFor="marks-name">Assessment Title</label>
        <input
          id="marks-name"
          className="form-input"
          value={f.assessmentName}
          onChange={e => setF(p => ({ ...p, assessmentName: e.target.value }))}
          placeholder="e.g. Mid-Term Exam, Lab Practical, Assignment 1"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="marks-score">Score Achieved (%) <span className="required">*</span></label>
        <input
          id="marks-score"
          type="number"
          className="form-input"
          value={f.score}
          onChange={e => setF(p => ({ ...p, score: e.target.value }))}
          min={0}
          max={100}
          step={0.5}
          placeholder="e.g. 84.5"
          required
        />
      </div>
      <div className="modal-footer" style={{ marginTop: 'var(--s6)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-marks">
          {loading ? 'Recording…' : 'Record Score'}
        </button>
      </div>
    </form>
  );
}

export default function SubjectsPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await subjectsAPI.getAll();
      setSubjects(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load subjects.');
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
        const res = await subjectsAPI.create(formData);
        setSubjects(p => [...p, res.data]);
        toast.success(`Subject "${res.data.name}" added successfully.`);
      } else {
        const res = await subjectsAPI.update(modal.subject._id, formData);
        setSubjects(p => p.map(s => s._id === res.data._id ? res.data : s));
        toast.success(`Subject "${res.data.name}" updated.`);
      }
      setModal(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMarks = async (formData) => {
    setSaving(true);
    try {
      const res = await subjectsAPI.addMarks(modal.subject._id, formData);
      setSubjects(p => p.map(s => s._id === res.data._id ? res.data : s));
      setModal(null);
      toast.success('Assessment score recorded.');
    } catch (err) {
      toast.error(err.message || 'Failed to add marks.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    setSaving(true);
    try {
      await subjectsAPI.delete(id);
      setSubjects(p => p.filter(s => s._id !== id));
      toast.success(`Subject "${name}" removed from curriculum.`);
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete subject.');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return <LoadingState message="Loading registered subjects…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

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
            Curriculum Structure
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Subjects
            <span style={{
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '2px 10px',
              color: 'var(--fg-secondary)',
            }}>
              {subjects.length} active
            </span>
          </h1>
          <p>
            Manage course credits, instructors, target marks, and attendance compliance.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal({ type: 'add' })}
          id="btn-add-subject"
          style={{ gap: 6 }}
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          <span>Add Subject</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} strokeWidth={1.8} />}
          title="No Registered Subjects"
          description="Register your current semester subjects to unlock attendance tracking, syllabus planning, and grade intelligence."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setModal({ type: 'add' })}
              id="btn-empty-add-subject"
            >
              Add First Subject
            </button>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--s5)',
        }}>
          {subjects.map((s) => {
            const attPct = s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 0;
            const threshold = s.attendanceThreshold || 75;
            const attColor = attPct >= threshold + 5
              ? 'var(--success)'
              : attPct >= threshold
                ? 'var(--warning)'
                : 'var(--danger)';

            const marksColor = s.currentMarks >= s.targetMarks ? 'var(--success)' : 'var(--accent)';
            const marksHistory = s.marksHistory || [];
            const lastThree = marksHistory.slice(-3).map(m => m.score);
            const trend = lastThree.length < 2 ? null : lastThree[lastThree.length - 1] - lastThree[0];

            return (
              <div
                key={s._id}
                className="card"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--card)',
                }}
              >
                {/* Accent top stripe */}
                <div style={{ height: 3, background: s.color || 'var(--accent)', width: '100%' }} />

                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Subject Code + Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 2,
                      color: 'var(--fg-primary)',
                      letterSpacing: '0.04em',
                    }}>
                      {s.code}
                    </span>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setModal({ type: 'marks', subject: s })}
                        title="Record Assessment Marks"
                        id={`btn-marks-${s._id}`}
                        aria-label={`Record marks for ${s.name}`}
                        style={{ padding: 6, color: 'var(--fg-muted)' }}
                      >
                        <Award size={13} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setModal({ type: 'edit', subject: s })}
                        title="Edit Subject"
                        id={`btn-edit-${s._id}`}
                        aria-label={`Edit ${s.name}`}
                        style={{ padding: 6, color: 'var(--fg-muted)' }}
                      >
                        <Edit2 size={13} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setDeleteConfirm({ id: s._id, name: s.name })}
                        title="Delete Subject"
                        id={`btn-del-${s._id}`}
                        aria-label={`Delete ${s.name}`}
                        style={{ padding: 6, color: 'var(--fg-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
                      >
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Instructor */}
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 800,
                    margin: '0 0 6px',
                    color: 'var(--fg-primary)',
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}>
                    {s.name}
                  </h3>

                  <div style={{
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 16,
                  }}>
                    <span>{s.teacher || 'Department Faculty'}</span>
                    <span style={{ color: 'var(--border-strong)' }}>•</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{s.credits} Credits</span>
                    {trend !== null && (
                      <>
                        <span style={{ color: 'var(--border-strong)' }}>•</span>
                        <span style={{
                          color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--fg-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                        }}>
                          {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{trend > 0 ? `+${trend}%` : `${trend}%`}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Attendance Bar */}
                  <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--fg-muted)' }}>Attendance</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: attColor }}>
                        {attPct}%
                      </span>
                    </div>
                    <ProgressBar value={attPct} color={attColor} />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--fg-faint)',
                      marginTop: 4,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <span>{s.attendedClasses || 0} / {s.totalClasses || 0} attended</span>
                      <span>Target: {threshold}%</span>
                    </div>

                    {s.totalClasses > 0 && attPct < threshold && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderLeft: '2px solid var(--danger)',
                        borderRadius: 2,
                        fontSize: 11,
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <AlertCircle size={12} style={{ flexShrink: 0 }} />
                        <span>
                          Recovery: Attend next <strong>{Math.max(1, Math.ceil(((threshold / 100) * s.totalClasses - s.attendedClasses) / (1 - threshold / 100)))}</strong> consecutive classes to reach {threshold}%
                        </span>
                      </div>
                    )}

                    {s.totalClasses > 0 && attPct >= threshold && (
                      <div style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderLeft: '2px solid var(--success)',
                        borderRadius: 2,
                        fontSize: 11,
                        color: 'var(--success)',
                      }}>
                        {Math.floor((s.attendedClasses - (threshold / 100) * s.totalClasses) / (threshold / 100)) > 0
                          ? `Buffer: Can miss ${Math.floor((s.attendedClasses - (threshold / 100) * s.totalClasses) / (threshold / 100))} class while maintaining ${threshold}%`
                          : `Attendance satisfies required ${threshold}% threshold`}
                      </div>
                    )}
                  </div>

                  {/* Marks Performance */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--fg-muted)' }}>Current Standing</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: marksColor }}>
                        {s.currentMarks}%
                      </span>
                    </div>
                    <ProgressBar value={s.currentMarks} color={marksColor} />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--fg-faint)',
                      marginTop: 4,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <span>Target: {s.targetMarks}%</span>
                      {marksHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(s._id)}
                          style={{
                            color: 'var(--accent)',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {expanded[s._id] ? 'Hide Scores' : `${marksHistory.length} Scores`}
                          {expanded[s._id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Assessment Log */}
                  {expanded[s._id] && marksHistory.length > 0 && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-faint)' }}>
                        Score Log
                      </div>
                      {[...marksHistory].reverse().slice(0, 4).map((m, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: 11.5,
                            padding: '4px 6px',
                            background: 'var(--bg-elevated)',
                            borderRadius: 2,
                          }}
                        >
                          <span style={{ color: 'var(--fg-secondary)' }}>{m.assessmentName}</span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            color: m.score >= s.targetMarks ? 'var(--success)' : 'var(--warning)',
                          }}>
                            {m.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Add Subject to Curriculum' : modal?.type === 'edit' ? 'Update Subject Details' : 'Record Assessment Score'}
      >
        {modal?.type === 'marks' ? (
          <MarksForm
            subject={modal.subject}
            onSave={handleAddMarks}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        ) : (
          <SubjectForm
            initial={modal?.subject}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            loading={saving}
          />
        )}
      </Modal>

      {/* Custom Deletion Confirmation Dialog (No window.confirm) */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Subject?"
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
                Are you sure you want to remove <strong style={{ color: 'var(--fg-primary)' }}>"{deleteConfirm?.name}"</strong> from your curriculum?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-faint)' }}>
                This will archive the subject record. Existing independent attendance records remain accessible.
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
              {saving ? 'Removing…' : 'Remove Subject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

