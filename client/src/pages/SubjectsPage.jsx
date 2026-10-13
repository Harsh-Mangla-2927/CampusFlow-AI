import React, { useState, useEffect } from 'react';
import { subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal, ProgressBar, SectionHeader } from '../components/SharedComponents';
import { BookOpen, Plus, Edit2, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useToast } from '../components/Toast';

const COLORS = ['#E8FF00','#FF6B2B','#22C55E','#38BDF8','#EF4444','#F59E0B','#A855F7','#EC4899','#FFFFFF','#666666'];

function SubjectForm({ initial, onSave, onCancel, loading }) {
  const [f, setF] = useState(initial || { name:'', code:'', teacher:'', credits:3, attendanceThreshold:75, targetMarks:75, color:COLORS[0] });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name || !f.code || !f.credits) { setErr('Name, code and credits are required.'); return; }
    onSave(f);
  };

  return (
    <form onSubmit={submit} noValidate id="form-subject">
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-name">Subject Name <span className="required">*</span></label>
          <input id="subj-name" className="form-input" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Data Structures & Algorithms" required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-code">Code <span className="required">*</span></label>
          <input id="subj-code" className="form-input" value={f.code} onChange={e => set('code', e.target.value)} placeholder="CS301" required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-teacher">Professor</label>
          <input id="subj-teacher" className="form-input" value={f.teacher} onChange={e => set('teacher', e.target.value)} placeholder="Prof. Sharma" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-credits">Credits <span className="required">*</span></label>
          <input id="subj-credits" type="number" className="form-input" value={f.credits} onChange={e => set('credits', Number(e.target.value))} min={1} max={6} required />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="subj-att">Attendance Threshold (%)</label>
          <input id="subj-att" type="number" className="form-input" value={f.attendanceThreshold} onChange={e => set('attendanceThreshold', Number(e.target.value))} min={0} max={100} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="subj-marks">Target Marks (%)</label>
          <input id="subj-marks" type="number" className="form-input" value={f.targetMarks} onChange={e => set('targetMarks', Number(e.target.value))} min={0} max={100} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Accent Color</label>
        <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)} className={`color-swatch${f.color === c ? ' selected' : ''}`}
              style={{ background: c, color: c }} aria-label={`Select color ${c}`} />
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel} id="btn-cancel-subject">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-subject">
          {loading ? <><span className="spinner" aria-hidden="true" />Saving…</> : (initial ? 'Update Subject' : 'Add Subject')}
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
    if (Number(f.score) < 0 || Number(f.score) > 100) { setErr('Score must be 0–100.'); return; }
    onSave({ assessmentName: f.assessmentName || 'Assessment', score: Number(f.score) });
  };

  return (
    <form onSubmit={submit} noValidate id="form-marks">
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 'var(--s5)' }}>
        Adding marks entry for: <strong style={{ color: 'var(--fg-primary)' }}>{subject.name}</strong>
      </p>
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-group" style={{ marginBottom: 'var(--s4)' }}>
        <label className="form-label" htmlFor="marks-name">Assessment Name</label>
        <input id="marks-name" className="form-input" value={f.assessmentName} onChange={e => setF(p => ({ ...p, assessmentName: e.target.value }))} placeholder="Mid-Term, Quiz 1, Practical…" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="marks-score">Score (0–100) <span className="required">*</span></label>
        <input id="marks-score" type="number" className="form-input" value={f.score} onChange={e => setF(p => ({ ...p, score: e.target.value }))} min={0} max={100} step={0.5} placeholder="78" required />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-marks">
          {loading ? <><span className="spinner" aria-hidden="true" />Saving…</> : 'Add Marks'}
        </button>
      </div>
    </form>
  );
}

function SubjectsPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [expanded, setExpanded] = useState({});
  const [deleting, setDeleting] = useState({});

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
        toast.success('Subject added successfully.');
      } else {
        const res = await subjectsAPI.update(modal.subject._id, formData);
        setSubjects(p => p.map(s => s._id === res.data._id ? res.data : s));
        toast.success('Subject updated.');
      }
      setModal(null);
    } catch (err) { toast.error(err.message || 'Failed to save subject.'); }
    finally { setSaving(false); }
  };

  const handleAddMarks = async (formData) => {
    setSaving(true);
    try {
      const res = await subjectsAPI.addMarks(modal.subject._id, formData);
      setSubjects(p => p.map(s => s._id === res.data._id ? res.data : s));
      setModal(null);
      toast.success('Marks entry added.');
    } catch (err) { toast.error(err.message || 'Failed to add marks.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}"? This will not delete related tasks or exams.`)) return;
    setDeleting(p => ({ ...p, [id]: true }));
    try {
      await subjectsAPI.delete(id);
      setSubjects(p => p.filter(s => s._id !== id));
      toast.success('Subject removed.');
    } catch (err) { toast.error(err.message); }
    finally { setDeleting(p => ({ ...p, [id]: false })); }
  };

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  if (loading) return <LoadingState message="Loading subjects…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Subjects</h1>
          <p>Your enrolled subjects, attendance, and performance records.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-add-subject">
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpen size={22} strokeWidth={1.5} />} title="No Subjects" description="Add your enrolled subjects to start tracking attendance, marks, and performance." action={<button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-empty-add-subject">Add First Subject</button>} />
      ) : (
        <div className="grid-3">
          {subjects.map((s) => {
            const attPct = s.totalClasses > 0 ? Math.round((s.attendedClasses / s.totalClasses) * 100) : 0;
            const attColor = attPct >= s.attendanceThreshold + 5 ? 'var(--success)' : attPct >= s.attendanceThreshold ? 'var(--warning)' : 'var(--danger)';
            const marksColor = s.currentMarks >= s.targetMarks ? 'var(--success)' : 'var(--accent)';
            const marksHistory = s.marksHistory || [];
            const lastThree = marksHistory.slice(-3).map(m => m.score);
            const trend = lastThree.length < 2 ? null : lastThree[lastThree.length - 1] - lastThree[0];

            return (
              <div key={s._id} className="subject-card">
                <div className="subject-card-accent" style={{ background: s.color || 'var(--accent)' }} aria-hidden="true" />
                <div style={{ paddingLeft: 'var(--s4)' }}>
                  <div className="subject-code-badge">{s.code}</div>
                  <div className="subject-card-name">{s.name}</div>
                  <div className="subject-card-meta">
                    {s.teacher && <span>{s.teacher}</span>}
                    <span>{s.credits} cr.</span>
                    {trend !== null && (
                      <span style={{ color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--fg-muted)' }}>
                        {trend > 0 ? <TrendingUp size={11} aria-label="Improving" /> : trend < 0 ? <TrendingDown size={11} aria-label="Declining" /> : <Minus size={11} aria-label="Stable" />}
                      </span>
                    )}
                  </div>

                  <div className="subject-card-actions">
                    <button className="subject-card-action-btn brass" onClick={() => setModal({ type: 'marks', subject: s })} title="Add Marks" id={`btn-marks-${s._id}`} aria-label={`Add marks for ${s.name}`}><Plus size={12} /></button>
                    <button className="subject-card-action-btn" onClick={() => setModal({ type: 'edit', subject: s })} title="Edit" id={`btn-edit-${s._id}`} aria-label={`Edit ${s.name}`}><Edit2 size={12} /></button>
                    <button className="subject-card-action-btn danger" onClick={() => handleDelete(s._id, s.name)} title="Delete" id={`btn-del-${s._id}`} aria-label={`Delete ${s.name}`}><Trash2 size={12} /></button>
                    <button className="subject-card-action-btn" onClick={() => toggleExpand(s._id)} title={expanded[s._id] ? 'Collapse' : 'Expand'} aria-expanded={expanded[s._id]} style={{ marginLeft: 'auto' }}>
                      {expanded[s._id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  <div className="subject-card-divider" />

                  {/* Attendance */}
                  <div className="subject-card-stat">
                    <span className="subject-card-stat-label">Attendance</span>
                    <span className="subject-card-stat-value" style={{ color: attColor }}>{attPct}%</span>
                  </div>
                  <ProgressBar value={attPct} color={attColor} />
                  <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4, marginBottom: 'var(--s4)' }}>
                    {s.attendedClasses}/{s.totalClasses} classes · Threshold: {s.attendanceThreshold}%
                  </div>

                  {/* Current Marks */}
                  <div className="subject-card-stat">
                    <span className="subject-card-stat-label">Current Marks</span>
                    <span className="subject-card-stat-value" style={{ color: marksColor }}>{s.currentMarks}%</span>
                  </div>
                  <ProgressBar value={s.currentMarks} color={marksColor} />
                  <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4 }}>
                    Target: {s.targetMarks}%
                  </div>

                  {/* Marks history */}
                  {expanded[s._id] && marksHistory.length > 0 && (
                    <div style={{ marginTop: 'var(--s4)', paddingTop: 'var(--s4)', borderTop: '1px solid var(--border)' }}>
                      <div className="subject-card-section-label">Marks History</div>
                      {[...marksHistory].reverse().slice(0, 5).map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <span style={{ color: 'var(--fg-muted)' }}>{m.assessmentName}</span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 14, color: m.score >= s.targetMarks ? 'var(--success)' : 'var(--warning)' }}>{m.score}%</span>
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

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Subject' : modal?.type === 'edit' ? 'Edit Subject' : 'Add Marks Entry'}>
        {modal?.type === 'marks' ? (
          <MarksForm subject={modal.subject} onSave={handleAddMarks} onCancel={() => setModal(null)} loading={saving} />
        ) : (
          <SubjectForm initial={modal?.subject} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
        )}
      </Modal>
    </div>
  );
}

export default SubjectsPage;
