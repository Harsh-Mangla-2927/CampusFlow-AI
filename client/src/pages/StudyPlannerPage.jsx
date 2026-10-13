import React, { useState, useEffect } from 'react';
import { studyPlansAPI, subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal, ProgressBar, SectionHeader } from '../components/SharedComponents';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';


const SESSION_COLORS = { Study: 'var(--accent)', Revision: 'var(--warning)', Practice: 'var(--info)', 'Mock Test': 'var(--danger)' };

function PlannerForm({ subjects, onSave, onCancel, loading }) {
  const [f, setF] = useState({ subject:'', title:'', examDate:'', availableHoursPerDay:'2', topics:'', difficulty:'Medium' });
  const [err, setErr] = useState('');
  const set = (k,v) => setF(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.subject || !f.title || !f.examDate) { setErr('Subject, title, and exam date are required.'); return; }
    const topics = f.topics.split('\n').map(t => t.trim()).filter(Boolean);
    onSave({ ...f, topics, availableHoursPerDay: parseFloat(f.availableHoursPerDay) });
  };

  return (
    <form onSubmit={submit} noValidate id="form-planner">
      {err && <div className="alert alert-danger" style={{ marginBottom:'var(--s4)' }}>{err}</div>}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="plan-subject">Subject <span className="required">*</span></label>
          <select id="plan-subject" className="form-select" value={f.subject} onChange={e => set('subject', e.target.value)} required>
            <option value="">— Select Subject —</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="plan-difficulty">Difficulty</label>
          <select id="plan-difficulty" className="form-select" value={f.difficulty} onChange={e => set('difficulty', e.target.value)}>
            {['Easy','Medium','Hard'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="plan-title">Plan Title <span className="required">*</span></label>
        <input id="plan-title" className="form-input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="DBMS End-Semester Study Plan" required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="plan-date">Exam Date <span className="required">*</span></label>
          <input id="plan-date" type="date" className="form-input" value={f.examDate} onChange={e => set('examDate', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="plan-hours">Hours/Day <span className="required">*</span></label>
          <input id="plan-hours" type="number" className="form-input" value={f.availableHoursPerDay} onChange={e => set('availableHoursPerDay', e.target.value)} min="0.5" max="16" step="0.5" required />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="plan-topics">Topics to Cover (one per line)</label>
        <textarea id="plan-topics" className="form-textarea" value={f.topics} onChange={e => set('topics', e.target.value)}
          placeholder={'Unit 1 — ER Diagrams\nUnit 2 — Relational Algebra\nUnit 3 — SQL\nUnit 4 — Normalization'} rows={5} />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-plan">
          {loading ? <><span className="spinner" aria-hidden="true" />Generating…</> : 'Generate Study Plan'}
        </button>
      </div>
    </form>
  );
}

function StudyPlannerPage() {
  const [plans, setPlans]         = useState([]);
  const { toast }                 = useToast();
  const [subjects, setSubjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [pr, sr] = await Promise.all([studyPlansAPI.getAll(), subjectsAPI.getAll()]);
      setPlans(pr.data || []);
      setSubjects(sr.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load study plans.');
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
      const res = await studyPlansAPI.create(formData);
      setPlans(p => [res.data, ...p]);
      setShowModal(false);
      toast.success('Study plan created.');
    } catch (err) { toast.error(err.message || 'Failed to create plan.'); }
    finally { setSaving(false); }
  };

  const handleToggleDay = async (planId, dayIndex) => {
    try {
      const res = await studyPlansAPI.toggleDay(planId, dayIndex);
      setPlans(p => p.map(plan => plan._id === res.data._id ? res.data : plan));
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this study plan?')) return;
    try {
      await studyPlansAPI.delete(id);
      setPlans(p => p.filter(plan => plan._id !== id));
      toast.success('Study plan removed.');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingState message="Loading study plans…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Study Planner</h1>
          <p>Day-by-day study schedules generated from your exam dates and availability.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-create-plan">
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          Generate Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={<Calendar size={22} strokeWidth={1.5} />} title="No Study Plans" description="Generate a personalized day-by-day study plan for your upcoming exams."
          action={<button className="btn btn-primary" onClick={() => setShowModal(true)}>Generate First Plan</button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s8)' }}>
          {plans.map((plan) => {
            const completed = plan.schedule.filter(d => d.completed).length;
            const progress = plan.schedule.length > 0 ? Math.round((completed / plan.schedule.length) * 100) : 0;
            const daysLeft = Math.ceil((new Date(plan.examDate) - new Date()) / 86400000);
            const daysColor = daysLeft <= 3 ? 'var(--danger)' : daysLeft <= 7 ? 'var(--warning)' : 'var(--success)';

            return (
              <div key={plan._id} style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                {/* Plan header */}
                <div style={{ padding: 'var(--s6)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s4)' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 4 }}>
                      {plan.subject?.name || 'Study Plan'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--fg-primary)', lineHeight: 1, marginBottom: 4 }}>
                      {plan.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      Exam: {formatDate(plan.examDate)} ·
                      <span style={{ color: daysColor, fontWeight: 700, marginLeft: 4 }}>
                        {daysLeft <= 0 ? 'Exam day!' : `${daysLeft} days left`}
                      </span>
                      {' · '}{plan.availableHoursPerDay}h/day · {plan.difficulty || 'Medium'} difficulty
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--accent)' }}>
                        {progress}%
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                        {completed}/{plan.schedule.length} sessions
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(plan._id)} id={`btn-del-plan-${plan._id}`} aria-label={`Delete plan: ${plan.title}`}>
                      <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <ProgressBar value={progress} color="var(--accent)" />

                {/* Schedule grid */}
                <div style={{ padding: 'var(--s5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1, background: 'var(--border)' }}>
                  {plan.schedule.map((entry, idx) => {
                    const entryDate = new Date(entry.date);
                    const isToday = entryDate.toDateString() === new Date().toDateString();
                    const isPast  = entryDate < new Date() && !isToday;
                    const sessionColor = SESSION_COLORS[entry.sessionType] || 'var(--fg-muted)';

                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleDay(plan._id, idx)}
                        role="checkbox"
                        aria-checked={entry.completed}
                        id={`day-${plan._id}-${idx}`}
                        title={entry.completed ? 'Mark incomplete' : 'Mark complete'}
                        style={{
                          background: entry.completed ? 'rgba(232,255,0,0.06)' : isToday ? 'rgba(255,255,255,0.03)' : 'var(--bg-base)',
                          border: `1px solid ${entry.completed ? 'var(--accent-border)' : isToday ? 'var(--border-strong)' : 'transparent'}`,
                          padding: 'var(--s3)',
                          cursor: 'pointer',
                          opacity: isPast && !entry.completed ? 0.45 : 1,
                          transition: 'all var(--t-fast)',
                          textAlign: 'left',
                          display: 'block',
                          width: '100%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--fg-faint)', letterSpacing: '0.06em' }}>
                            D{entry.day}
                          </span>
                          <span style={{ width: 8, height: 8, background: entry.completed ? 'var(--accent)' : isToday ? 'var(--fg-secondary)' : 'transparent', border: `1px solid ${entry.completed ? 'var(--accent)' : 'var(--fg-faint)'}`, flexShrink: 0 }} aria-hidden="true" />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 4 }}>
                          {formatDate(entry.date, { day: 'numeric', month: 'short' })}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: entry.completed ? 'var(--accent)' : 'var(--fg-primary)', lineHeight: 1.3, marginBottom: 4 }}>
                          {entry.topic}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, color: sessionColor, fontWeight: 700, letterSpacing: '0.04em' }}>{entry.sessionType}</span>
                          <span style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{entry.hoursPlanned}h</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate Study Plan">
        <PlannerForm subjects={subjects} onSave={handleSave} onCancel={() => setShowModal(false)} loading={saving} />
      </Modal>
    </div>
  );
}

export default StudyPlannerPage;
