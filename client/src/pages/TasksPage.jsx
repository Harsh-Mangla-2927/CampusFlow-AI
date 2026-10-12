import React, { useState, useEffect } from 'react';
import { tasksAPI, subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal } from '../components/SharedComponents';
import { CheckSquare, Plus, Edit2, Trash2 } from 'lucide-react';
import { deadlineLabel, getPriorityBadgeClass, formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];
const TYPE_OPTIONS   = ['Assignment', 'Lab', 'Project', 'Quiz', 'Other'];
const FILTER_TABS    = ['All', 'Pending', 'In Progress', 'Completed'];

function TaskForm({ subjects, initial, onSave, onCancel, loading }) {
  // Backend field is `deadline`, not `dueDate`
  const [f, setF] = useState(initial ? {
    title:          initial.title || '',
    description:    initial.description || '',
    subject:        initial.subject?._id || initial.subject || '',
    deadline:       initial.deadline ? initial.deadline.slice(0, 10) : '',
    priority:       initial.priority || 'MEDIUM',
    type:           initial.type || 'Assignment',
    estimatedHours: initial.estimatedHours || 2,
    status:         initial.status || 'Pending',
  } : {
    title: '', description: '', subject: '', deadline: '',
    priority: 'MEDIUM', type: 'Assignment', estimatedHours: 2, status: 'Pending',
  });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim())    { setErr('Title is required.'); return; }
    if (!f.deadline)        { setErr('Deadline is required.'); return; }
    onSave(f);
  };

  return (
    <form onSubmit={submit} noValidate id="form-task">
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-group">
        <label className="form-label" htmlFor="task-title">Title <span className="required">*</span></label>
        <input id="task-title" className="form-input" value={f.title} onChange={e => set('title', e.target.value)} placeholder="DBMS Assignment 3" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="task-desc">Description</label>
        <textarea id="task-desc" className="form-textarea" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes…" rows={2} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-subject">Subject</label>
          <select id="task-subject" className="form-select" value={f.subject} onChange={e => set('subject', e.target.value)}>
            <option value="">— None —</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-type">Type</label>
          <select id="task-type" className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-deadline">Deadline <span className="required">*</span></label>
          <input id="task-deadline" type="date" className="form-input" value={f.deadline} onChange={e => set('deadline', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-hours">Est. Hours</label>
          <input id="task-hours" type="number" className="form-input" value={f.estimatedHours} onChange={e => set('estimatedHours', Number(e.target.value))} min={0.5} max={40} step={0.5} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-priority">Priority</label>
          <select id="task-priority" className="form-select" value={f.priority} onChange={e => set('priority', e.target.value)}>
            {['LOW', 'MEDIUM', 'HIGH'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-status">Status</label>
          <select id="task-status" className="form-select" value={f.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-task">
          {loading ? <><span className="spinner" aria-hidden="true" />Saving…</> : (initial ? 'Update Task' : 'Add Task')}
        </button>
      </div>
    </form>
  );
}

function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks]       = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [modal, setModal]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [filter, setFilter]     = useState('All');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [tr, sr] = await Promise.all([tasksAPI.getAll(), subjectsAPI.getAll()]);
      setTasks(tr.data || []);
      setSubjects(sr.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
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
        const res = await tasksAPI.create(formData);
        setTasks(p => [res.data, ...p]);
        toast.success('Task added.');
      } else {
        const res = await tasksAPI.update(modal.task._id, formData);
        setTasks(p => p.map(t => t._id === res.data._id ? res.data : t));
        toast.success('Task updated.');
      }
      setModal(null);
    } catch (err) { toast.error(err.message || 'Failed to save task.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Remove task "${title}"?`)) return;
    try { await tasksAPI.delete(id); setTasks(p => p.filter(t => t._id !== id)); toast.success('Task removed.'); }
    catch (err) { toast.error(err.message); }
  };

  const handleToggle = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await tasksAPI.update(task._id, { status: newStatus });
      setTasks(p => p.map(t => t._id === res.data._id ? res.data : t));
      toast.success(newStatus === 'Completed' ? 'Task completed! ✓' : 'Task reopened.');
    } catch (err) { toast.error(err.message); }
  };

  if (loading) return <LoadingState message="Loading tasks…" />;
  if (error)   return <ErrorState message={error} onRetry={() => { setLoaded(false); setError(''); }} />;

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const now = new Date();
  const counts = {
    All:         tasks.length,
    Pending:     tasks.filter(t => t.status === 'Pending').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Completed:   tasks.filter(t => t.status === 'Completed').length,
  };
  const overdueCount = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now).length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Tasks</h1>
          <p>Assignments, labs, projects — prioritized by the intelligence engine.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-add-task">
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          Add Task
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 'var(--s6)', marginBottom: 'var(--s6)', flexWrap: 'wrap' }}>
        {[
          { label: 'Total',      value: tasks.length,          color: 'var(--fg-primary)' },
          { label: 'Pending',    value: counts['Pending'],      color: 'var(--warning)' },
          { label: 'In Progress',value: counts['In Progress'],  color: 'var(--accent)' },
          { label: 'Done',       value: counts['Completed'],    color: 'var(--success)' },
          { label: 'Overdue',    value: overdueCount,           color: 'var(--danger)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ paddingRight: 'var(--s6)', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', marginBottom: 'var(--s6)', borderBottom: '1px solid var(--border)' }} role="tablist" aria-label="Task filter">
        {FILTER_TABS.map(tab => (
          <button key={tab} role="tab" aria-selected={filter === tab} onClick={() => setFilter(tab)}
            id={`filter-${tab.replace(' ', '-').toLowerCase()}`}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: filter === tab ? 'var(--accent)' : 'var(--fg-muted)',
              borderBottom: `2px solid ${filter === tab ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, background: 'none', cursor: 'pointer', transition: 'all var(--t-fast)',
            }}>
            {tab} <span style={{ color: 'var(--fg-faint)', fontWeight: 400 }}>({counts[tab]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={22} strokeWidth={1.5} />} title="No Tasks"
          description={filter === 'All' ? 'Add tasks to get priority scores and deadline tracking.' : `No ${filter.toLowerCase()} tasks.`}
          action={filter === 'All' ? <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })} id="btn-empty-add-task">Add First Task</button> : null} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
          {filtered.map((task) => {
            const isOverdue = task.status !== 'Completed' && new Date(task.deadline) < now;
            const isDone    = task.status === 'Completed';
            const level     = task.priorityLevel || task.priority || 'MEDIUM';
            const borderColor = isDone ? 'var(--success)' : isOverdue ? 'var(--danger)' : level === 'HIGH' ? 'var(--danger)' : level === 'MEDIUM' ? 'var(--warning)' : 'var(--success)';

            return (
              <div key={task._id} className={`priority-card priority-card-${level.toLowerCase()}`}
                style={{ background: isDone ? 'var(--bg-surface)' : 'var(--bg-elevated)', opacity: isDone ? 0.7 : 1, display: 'flex', alignItems: 'flex-start', gap: 'var(--s4)', borderLeft: `3px solid ${borderColor}` }}>

                {/* Checkbox */}
                <button onClick={() => handleToggle(task)} id={`toggle-${task._id}`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                  style={{ width: 20, height: 20, border: `2px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`, background: isDone ? 'var(--success)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-fg)', transition: 'all var(--t-fast)', cursor: 'pointer' }}>
                  {isDone && <span style={{ fontSize: 11, fontWeight: 900 }}>✓</span>}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="priority-card-header">
                    <div>
                      <div className="priority-card-title" style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
                      {task.subject && <div className="priority-card-subject">{task.subject.name || task.subject.code}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexShrink: 0 }}>
                      {task.priorityScore != null && (
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, color: isDone ? 'var(--fg-faint)' : borderColor }}>{task.priorityScore}</div>
                      )}
                      <div style={{ display: 'flex', gap: 'var(--s1)' }}>
                        <button className="subject-card-action-btn" onClick={() => setModal({ type: 'edit', task })} id={`btn-edit-task-${task._id}`} aria-label={`Edit ${task.title}`}><Edit2 size={11} /></button>
                        <button className="subject-card-action-btn danger" onClick={() => handleDelete(task._id, task.title)} id={`btn-del-task-${task._id}`} aria-label={`Delete ${task.title}`}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="priority-card-meta">
                    <span className="priority-card-meta-item" style={{ color: isOverdue ? 'var(--danger)' : 'var(--fg-muted)' }}>
                      {deadlineLabel(task.deadline)}
                    </span>
                    {task.estimatedHours && <span className="priority-card-meta-item">{task.estimatedHours}h est.</span>}
                    <span className="badge badge-neutral">{task.type}</span>
                    <span className={getPriorityBadgeClass(level)}>{level}</span>
                  </div>
                  {task.priorityExplanation && !isDone && (
                    <div className="priority-explanation">{task.priorityExplanation}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.type === 'add' ? 'Add Task' : 'Edit Task'}>
        <TaskForm subjects={subjects} initial={modal?.task} onSave={handleSave} onCancel={() => setModal(null)} loading={saving} />
      </Modal>
    </div>
  );
}

export default TasksPage;
