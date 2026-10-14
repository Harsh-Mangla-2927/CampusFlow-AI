import React, { useState, useEffect } from 'react';
import { tasksAPI, subjectsAPI } from '../services/api';
import { LoadingState, ErrorState, EmptyState, Modal } from '../components/SharedComponents';
import {
  CheckSquare, Plus, Edit2, Trash2, Clock, Calendar,
  AlertTriangle, Filter, CheckCircle2, AlertCircle
} from 'lucide-react';
import { deadlineLabel, getPriorityBadgeClass } from '../utils/helpers';
import { useToast } from '../components/Toast';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];
const TYPE_OPTIONS   = ['Assignment', 'Lab', 'Project', 'Quiz', 'Other'];
const FILTER_TABS    = ['All', 'Pending', 'In Progress', 'Completed'];

function TaskForm({ subjects, initial, onSave, onCancel, loading }) {
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
    if (!f.title.trim()) { setErr('Task title is required.'); return; }
    if (!f.deadline)     { setErr('Deadline date is required.'); return; }
    onSave({
      ...f,
      title: f.title.trim(),
      description: f.description.trim(),
      estimatedHours: Number(f.estimatedHours) || 1,
    });
  };

  return (
    <form onSubmit={submit} noValidate id="form-task">
      {err && <div className="alert alert-danger" style={{ marginBottom: 'var(--s4)' }}>{err}</div>}
      <div className="form-group">
        <label className="form-label" htmlFor="task-title">Task Title <span className="required">*</span></label>
        <input
          id="task-title"
          className="form-input"
          value={f.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. DBMS Assignment 3 - Relational Algebra"
          required
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="task-desc">Description & References</label>
        <textarea
          id="task-desc"
          className="form-textarea"
          value={f.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Requirements, submission link, rubric notes…"
          rows={2}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-subject">Related Subject</label>
          <select id="task-subject" className="form-select" value={f.subject} onChange={e => set('subject', e.target.value)}>
            <option value="">— Select Subject (Optional) —</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-type">Task Category</label>
          <select id="task-type" className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-deadline">Submission Deadline <span className="required">*</span></label>
          <input
            id="task-deadline"
            type="date"
            className="form-input"
            value={f.deadline}
            onChange={e => set('deadline', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-hours">Estimated Effort (Hours)</label>
          <input
            id="task-hours"
            type="number"
            className="form-input"
            value={f.estimatedHours}
            onChange={e => set('estimatedHours', Number(e.target.value))}
            min={0.5}
            max={50}
            step={0.5}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="task-priority">Priority Level</label>
          <select id="task-priority" className="form-select" value={f.priority} onChange={e => set('priority', e.target.value)}>
            {['LOW', 'MEDIUM', 'HIGH'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-status">Current Status</label>
          <select id="task-status" className="form-select" value={f.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="modal-footer" style={{ marginTop: 'var(--s6)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading} id="btn-save-task">
          {loading ? 'Saving…' : (initial ? 'Update Task' : 'Add Task')}
        </button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks]       = useState([]);
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
      const [tr, sr] = await Promise.all([tasksAPI.getAll(), subjectsAPI.getAll()]);
      setTasks(tr.data || []);
      setSubjects(sr.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load task queue.');
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
        toast.success(`Task "${res.data.title}" created.`);
      } else {
        const res = await tasksAPI.update(modal.task._id, formData);
        setTasks(p => p.map(t => t._id === res.data._id ? res.data : t));
        toast.success(`Task "${res.data.title}" updated.`);
      }
      setModal(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, title } = deleteConfirm;
    setSaving(true);
    try {
      await tasksAPI.delete(id);
      setTasks(p => p.filter(t => t._id !== id));
      toast.success(`Task "${title}" removed.`);
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.message || 'Failed to remove task.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await tasksAPI.update(task._id, { status: newStatus });
      setTasks(p => p.map(t => t._id === res.data._id ? res.data : t));
      toast.success(newStatus === 'Completed' ? 'Task marked as completed! ✓' : 'Task reopened as pending.');
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  if (loading) return <LoadingState message="Loading academic task queue…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);
  const now = new Date();
  const counts = {
    All:           tasks.length,
    Pending:       tasks.filter(t => t.status === 'Pending').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Completed:     tasks.filter(t => t.status === 'Completed').length,
  };
  const overdueCount = tasks.filter(t => t.status !== 'Completed' && new Date(t.deadline) < now).length;

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
            Academic Obligations
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            Tasks
            <span style={{
              fontSize: 14,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              padding: '2px 10px',
              color: 'var(--fg-secondary)',
            }}>
              {counts.Pending + counts['In Progress']} active
            </span>
          </h1>
          <p>
            Assignments, laboratories, and milestones prioritized dynamically by urgency and credits.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModal({ type: 'add' })}
          id="btn-add-task"
          style={{ gap: 6 }}
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
          <span>Add Task</span>
        </button>
      </div>

      {/* ── METRICS STRIP ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 'var(--s3)',
        marginBottom: 'var(--s6)',
      }}>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Total Backlog</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem' }}>{tasks.length}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Pending</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--warning)' }}>{counts.Pending}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--accent)' }}>{counts['In Progress']}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Completed</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: 'var(--success)' }}>{counts.Completed}</div>
        </div>
        <div className="stat-card" style={{ padding: '12px 16px' }}>
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value" style={{ fontSize: '1.6rem', color: overdueCount > 0 ? 'var(--danger)' : 'var(--fg-muted)' }}>
            {overdueCount}
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
        aria-label="Filter tasks by status"
      >
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            onClick={() => setFilter(tab)}
            id={`filter-${tab.replace(' ', '-').toLowerCase()}`}
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
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* ── TASK LIST ── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} strokeWidth={1.8} />}
          title={filter === 'All' ? 'Task Queue Empty' : `No ${filter} Tasks`}
          description={
            filter === 'All'
              ? 'Add homework assignments, lab reports, or project milestones to activate dynamic prioritization.'
              : `You have no tasks marked as "${filter}".`
          }
          action={
            filter === 'All' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ type: 'add' })}
                id="btn-empty-add-task"
              >
                Create First Task
              </button>
            ) : null
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((task) => {
            const isOverdue = task.status !== 'Completed' && new Date(task.deadline) < now;
            const isDone    = task.status === 'Completed';
            const level     = task.priorityLevel || task.priority || 'MEDIUM';
            const borderColor = isDone
              ? 'var(--success)'
              : isOverdue
                ? 'var(--danger)'
                : level === 'HIGH'
                  ? 'var(--danger)'
                  : level === 'MEDIUM'
                    ? 'var(--warning)'
                    : 'var(--success)';

            return (
              <div
                key={task._id}
                className="card"
                style={{
                  background: isDone ? 'var(--bg-surface)' : 'var(--card)',
                  opacity: isDone ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${borderColor}`,
                  padding: '16px 20px',
                  transition: 'border-color var(--t-fast)',
                }}
              >
                {/* Complete Toggle Checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(task)}
                  id={`toggle-${task._id}`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark as complete'}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: `2px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`,
                    background: isDone ? 'var(--success)' : 'transparent',
                    flexShrink: 0,
                    marginTop: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all var(--t-fast)',
                  }}
                  title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isDone && <CheckCircle2 size={14} strokeWidth={3} />}
                </button>

                {/* Main Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                    <div>
                      <div style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--fg-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        lineHeight: 1.3,
                      }}>
                        {task.title}
                      </div>
                      {task.subject && (
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11.5,
                          color: 'var(--fg-muted)',
                          marginTop: 2,
                        }}>
                          {task.subject.code ? `${task.subject.code} · ` : ''}{task.subject.name}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                      {task.priorityScore != null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            lineHeight: 1,
                            color: isDone ? 'var(--fg-faint)' : borderColor,
                          }}>
                            {task.priorityScore}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                            priority
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setModal({ type: 'edit', task })}
                          id={`btn-edit-task-${task._id}`}
                          aria-label={`Edit ${task.title}`}
                          style={{ padding: 6, color: 'var(--fg-muted)' }}
                        >
                          <Edit2 size={13} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setDeleteConfirm({ id: task._id, title: task.title })}
                          id={`btn-del-task-${task._id}`}
                          aria-label={`Delete ${task.title}`}
                          style={{ padding: 6, color: 'var(--fg-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-muted)'}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {task.description && (
                    <div style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                      {task.description}
                    </div>
                  )}

                  {/* Metadata Tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                    <span style={{
                      fontSize: 11.5,
                      fontFamily: 'var(--font-mono)',
                      color: isOverdue ? 'var(--danger)' : 'var(--fg-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontWeight: isOverdue ? 700 : 500,
                    }}>
                      <Clock size={12} />
                      {deadlineLabel(task.deadline)}
                      {isOverdue && <span className="badge badge-high" style={{ marginLeft: 4 }}>OVERDUE</span>}
                    </span>

                    {task.estimatedHours && (
                      <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                        {task.estimatedHours}h est.
                      </span>
                    )}

                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>{task.type}</span>
                    <span className={getPriorityBadgeClass(level)} style={{ fontSize: 10 }}>{level}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 10, textTransform: 'capitalize' }}>
                      {task.status}
                    </span>
                  </div>

                  {task.priorityExplanation && !isDone && (
                    <div style={{
                      fontSize: 11.5,
                      color: 'var(--fg-faint)',
                      marginTop: 8,
                      paddingTop: 6,
                      borderTop: '1px dashed var(--border-subtle)',
                      lineHeight: 1.4,
                    }}>
                      {task.priorityExplanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'add' ? 'Create Academic Task' : 'Edit Task Details'}
      >
        <TaskForm
          subjects={subjects}
          initial={modal?.task}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          loading={saving}
        />
      </Modal>

      {/* Custom Deletion Confirmation Dialog (No window.confirm) */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove Task?"
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
                Are you sure you want to remove <strong style={{ color: 'var(--fg-primary)' }}>"{deleteConfirm?.title}"</strong>?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--fg-faint)' }}>
                This task will be removed from your active priority queue and completion analytics.
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
              {saving ? 'Removing…' : 'Remove Task'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

