import React, { useState } from 'react';
import { authAPI, subjectsAPI, examsAPI, tasksAPI } from '../services/api';
import { CheckCircle2, ChevronRight, X, BookOpen, Calendar, CheckSquare, Clock, User, Zap } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Academic Profile', desc: 'Confirm your current course, semester, and academic section.', icon: User },
  { id: 2, title: 'Curriculum Subjects', desc: 'Add your active subjects and target attendance thresholds.', icon: BookOpen },
  { id: 3, title: 'Upcoming Examinations', desc: 'Log immediate midterms, internals, or final dates.', icon: Calendar },
  { id: 4, title: 'Tasks & Deadlines', desc: 'Record active assignments and lab submissions.', icon: CheckSquare },
  { id: 5, title: 'Study Schedule', desc: 'Configure target daily study hours and preferred pace.', icon: Clock },
];

export default function OnboardingModal({ user, onComplete, onUserUpdate }) {
  const userId = user?._id || user?.id || '';
  const [currentStep, setCurrentStep] = useState(() => {
    if (!userId) return 1;
    try {
      const saved = Number(localStorage.getItem(`cf_onboarding_step_${userId}`));
      if (saved >= 1 && saved <= STEPS.length) return saved;
    } catch (_) {}
    return 1;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToStep = (step) => {
    setError('');
    const clamped = Math.max(1, Math.min(STEPS.length, step));
    setCurrentStep(clamped);
    if (userId) {
      try {
        localStorage.setItem(`cf_onboarding_step_${userId}`, String(clamped));
      } catch (_) {}
    }
  };

  // Step 1: Academic Profile
  const [profile, setProfile] = useState({
    course: user?.course || '',
    semester: user?.semester || 1,
    section: user?.section || '',
    rollNumber: user?.rollNumber || '',
  });

  // Step 2: Subject quick add
  const [subject, setSubject] = useState({
    name: '',
    code: '',
    credits: 4,
    attendanceThreshold: 75,
  });
  const [addedSubjects, setAddedSubjects] = useState([]);

  // Step 3: Exam quick add
  const [exam, setExam] = useState({
    title: '',
    subjectId: '',
    date: '',
    examType: 'Midterm',
  });
  const [addedExams, setAddedExams] = useState([]);

  // Step 4: Task quick add
  const [task, setTask] = useState({
    title: '',
    subjectId: '',
    deadline: '',
    priorityLevel: 'HIGH',
  });
  const [addedTasks, setAddedTasks] = useState([]);

  // Step 5: Study Preferences
  const [studyHours, setStudyHours] = useState('3');

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    if (userId) {
      try {
        localStorage.setItem(`cf_onboarding_dismissed_${userId}`, 'true');
        localStorage.removeItem(`cf_onboarding_step_${userId}`);
      } catch (_) {}
    }
    try {
      const res = await authAPI.updateProfile({ onboardingCompleted: true });
      if (res?.data?.user && onUserUpdate) {
        onUserUpdate(res.data.user);
      }
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to finish onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (userId) {
      try {
        localStorage.setItem(`cf_onboarding_dismissed_${userId}`, 'true');
        localStorage.removeItem(`cf_onboarding_step_${userId}`);
      } catch (_) {}
    }
    try {
      await authAPI.updateProfile({ onboardingCompleted: true }).catch(() => {});
    } finally {
      onComplete();
    }
  };

  const handleSaveStep1 = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.updateProfile({
        course: profile.course.trim(),
        semester: Number(profile.semester),
        section: profile.section.trim(),
        rollNumber: profile.rollNumber.trim(),
      });
      if (res?.data?.user && onUserUpdate) {
        onUserUpdate(res.data.user);
      }
      goToStep(2);
    } catch (err) {
      setError(err.message || 'Failed to update academic profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async () => {
    if (!subject.name.trim() || !subject.code.trim()) {
      setError('Please provide subject name and course code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await subjectsAPI.create({
        name: subject.name.trim(),
        code: subject.code.trim().toUpperCase(),
        credits: Number(subject.credits),
        attendanceThreshold: Number(subject.attendanceThreshold),
      });
      if (res?.data) {
        setAddedSubjects(prev => [...prev, res.data]);
        setSubject({ name: '', code: '', credits: 4, attendanceThreshold: 75 });
      }
    } catch (err) {
      setError(err.message || 'Failed to add subject.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = async () => {
    if (!exam.title.trim() || !exam.date) {
      setError('Exam title and date are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: exam.title.trim(),
        date: exam.date,
        examType: exam.examType,
      };
      if (exam.subjectId) payload.subject = exam.subjectId;
      const res = await examsAPI.create(payload);
      if (res?.data) {
        setAddedExams(prev => [...prev, res.data]);
        setExam({ title: '', subjectId: '', date: '', examType: 'Midterm' });
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!task.title.trim() || !task.deadline) {
      setError('Task title and deadline are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        title: task.title.trim(),
        deadline: task.deadline,
        priorityLevel: task.priorityLevel,
      };
      if (task.subjectId) payload.subject = task.subjectId;
      const res = await tasksAPI.create(payload);
      if (res?.data) {
        setAddedTasks(prev => [...prev, res.data]);
        setTask({ title: '', subjectId: '', deadline: '', priorityLevel: 'HIGH' });
      }
    } catch (err) {
      setError(err.message || 'Failed to add task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-heading"
      style={{
        zIndex: 9999,
        background: 'rgba(5, 5, 5, 0.88)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal-box"
        style={{
          maxWidth: 640,
          border: '1px solid var(--border-medium)',
          background: 'var(--bg-surface)',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 2,
        }}
      >
        {/* Top Progress Bar */}
        <div style={{ height: 3, background: 'var(--border-subtle)', width: '100%' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--accent)',
              width: `${(currentStep / STEPS.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
            }}>
              Step {currentStep} of {STEPS.length} · First-Time Setup
            </div>
            <h2 id="onboarding-heading" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 800,
              color: 'var(--fg-primary)',
              margin: '3px 0 0',
            }}>
              {STEPS[currentStep - 1].title}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: '3px 0 0' }}>
              {STEPS[currentStep - 1].desc}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleSkip}
            title="Finish setup later from settings"
            style={{ fontSize: 12, color: 'var(--fg-muted)' }}
          >
            Skip Setup <X size={13} style={{ marginLeft: 4 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* STEP 1: Academic Profile */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ob-course">Degree / Course</label>
                <input
                  id="ob-course"
                  className="form-input"
                  value={profile.course}
                  onChange={e => setProfile({ ...profile, course: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science & Engineering"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ob-semester">Current Semester</label>
                  <select
                    id="ob-semester"
                    className="form-select"
                    value={profile.semester}
                    onChange={e => setProfile({ ...profile, semester: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ob-section">Section / Class</label>
                  <input
                    id="ob-section"
                    className="form-input"
                    value={profile.section}
                    onChange={e => setProfile({ ...profile, section: e.target.value })}
                    placeholder="e.g. CSE-A"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ob-roll">University Roll Number</label>
                <input
                  id="ob-roll"
                  className="form-input"
                  value={profile.rollNumber}
                  onChange={e => setProfile({ ...profile, rollNumber: e.target.value })}
                  placeholder="e.g. 2110990000"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Enrolled Subjects */}
          {currentStep === 2 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-subj-name">Subject Name</label>
                    <input
                      id="ob-subj-name"
                      className="form-input"
                      value={subject.name}
                      onChange={e => setSubject({ ...subject, name: e.target.value })}
                      placeholder="e.g. Operating Systems"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-subj-code">Course Code</label>
                    <input
                      id="ob-subj-code"
                      className="form-input"
                      value={subject.code}
                      onChange={e => setSubject({ ...subject, code: e.target.value })}
                      placeholder="e.g. CS202"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-subj-credits">Credits</label>
                    <input
                      id="ob-subj-credits"
                      type="number"
                      className="form-input"
                      value={subject.credits}
                      onChange={e => setSubject({ ...subject, credits: e.target.value })}
                      min="1"
                      max="6"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-subj-thresh">Attendance Target (%)</label>
                    <input
                      id="ob-subj-thresh"
                      type="number"
                      className="form-input"
                      value={subject.attendanceThreshold}
                      onChange={e => setSubject({ ...subject, attendanceThreshold: e.target.value })}
                      min="50"
                      max="100"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddSubject}
                  disabled={loading || !subject.name.trim()}
                  style={{ alignSelf: 'flex-start' }}
                >
                  + Add This Subject
                </button>
              </div>

              {addedSubjects.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Enrolled Courses ({addedSubjects.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {addedSubjects.map((s, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                      }}>
                        <span><strong>{s.code}:</strong> {s.name}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>{s.credits} Credits · Goal {s.attendanceThreshold}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Upcoming Examinations */}
          {currentStep === 3 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-exam-title">Exam Title</label>
                    <input
                      id="ob-exam-title"
                      className="form-input"
                      value={exam.title}
                      onChange={e => setExam({ ...exam, title: e.target.value })}
                      placeholder="e.g. Midterm Assessment"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-exam-type">Type</label>
                    <select
                      id="ob-exam-type"
                      className="form-select"
                      value={exam.examType}
                      onChange={e => setExam({ ...exam, examType: e.target.value })}
                    >
                      <option value="Midterm">Midterm</option>
                      <option value="End Semester">End Semester</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Lab Exam">Lab Exam</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-exam-date">Date</label>
                    <input
                      id="ob-exam-date"
                      type="date"
                      className="form-input"
                      value={exam.date}
                      onChange={e => setExam({ ...exam, date: e.target.value })}
                    />
                  </div>
                  {addedSubjects.length > 0 && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="ob-exam-subj">Course</label>
                      <select
                        id="ob-exam-subj"
                        className="form-select"
                        value={exam.subjectId}
                        onChange={e => setExam({ ...exam, subjectId: e.target.value })}
                      >
                        <option value="">— General / Select —</option>
                        {addedSubjects.map(s => (
                          <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddExam}
                  disabled={loading || !exam.title.trim() || !exam.date}
                  style={{ alignSelf: 'flex-start' }}
                >
                  + Add This Exam
                </button>
              </div>

              {addedExams.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Scheduled Exams ({addedExams.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {addedExams.map((ex, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                      }}>
                        <span><strong>{ex.title}</strong> ({ex.examType})</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{new Date(ex.date).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Tasks & Deadlines */}
          {currentStep === 4 && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ob-task-title">Assignment / Task Title</label>
                  <input
                    id="ob-task-title"
                    className="form-input"
                    value={task.title}
                    onChange={e => setTask({ ...task, title: e.target.value })}
                    placeholder="e.g. Lab Exercise 3 or Research Summary"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-task-date">Submission Deadline</label>
                    <input
                      id="ob-task-date"
                      type="date"
                      className="form-input"
                      value={task.deadline}
                      onChange={e => setTask({ ...task, deadline: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ob-task-prio">Priority</label>
                    <select
                      id="ob-task-prio"
                      className="form-select"
                      value={task.priorityLevel}
                      onChange={e => setTask({ ...task, priorityLevel: e.target.value })}
                    >
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddTask}
                  disabled={loading || !task.title.trim() || !task.deadline}
                  style={{ alignSelf: 'flex-start' }}
                >
                  + Add This Task
                </button>
              </div>

              {addedTasks.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Added Tasks ({addedTasks.length}):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {addedTasks.map((t, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12.5,
                      }}>
                        <span><strong>{t.title}</strong></span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>Due {new Date(t.deadline).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Study Preferences */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="ob-study-hours">
                  Target Daily Study Time (Hours per day)
                </label>
                <input
                  id="ob-study-hours"
                  type="number"
                  className="form-input"
                  value={studyHours}
                  onChange={e => setStudyHours(e.target.value)}
                  min="1"
                  max="12"
                  step="0.5"
                />
                <p style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 4 }}>
                  The adaptive study planner uses this to allocate realistic revision blocks before exams.
                </p>
              </div>

              <div style={{
                padding: '14px 16px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 2,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 700, fontSize: 13 }}>
                  <CheckCircle2 size={16} /> Ready to Activate Academic Intelligence
                </div>
                <p style={{ fontSize: 12, color: 'var(--fg-secondary)', margin: '6px 0 0', lineHeight: 1.45 }}>
                  Your workspace is now calibrated. You can fine-tune subjects, record class attendance, and launch automated study schedules anytime.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setError(''); setCurrentStep(s => s - 1); }}
                disabled={loading}
              >
                ← Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => goToStep(currentStep - 1)}
                disabled={loading}
              >
                Back
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip Setup
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveStep1}
                disabled={loading}
              >
                Save & Continue <ChevronRight size={13} />
              </button>
            )}

            {currentStep > 1 && currentStep < 5 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => goToStep(currentStep + 1)}
                disabled={loading}
              >
                Continue to Step {currentStep + 1} <ChevronRight size={13} />
              </button>
            )}

            {currentStep === 5 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleFinish}
                disabled={loading}
                id="btn-complete-onboarding"
              >
                {loading ? 'Activating Workspace…' : 'Enter Workspace →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
