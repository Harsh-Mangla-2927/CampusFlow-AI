import React, { useState } from 'react';
import { clearAuth, authAPI, updateStoredUser } from '../services/api';
import { useToast } from '../components/Toast';
import { User, LogOut, Edit2, Save, X, Lock } from 'lucide-react';

function FieldError({ msg }) {
  if (!msg) return null;
  return <div className="field-error" role="alert">{msg}</div>;
}

function ProfilePage({ user, onLogout, onUserUpdate }) {
  const { toast } = useToast();
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Profile edit form
  const [pf, setPf] = useState({
    name:       user?.name       || '',
    university: user?.university || '',
    course:     user?.course     || '',
    semester:   user?.semester   || 1,
    section:    user?.section    || '',
    rollNumber: user?.rollNumber || '',
  });
  const [pfErrors, setPfErrors] = useState({});

  // Password form
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});

  const setP  = (k, v) => { setPf(p => ({ ...p, [k]: v })); setPfErrors(p => ({ ...p, [k]: '' })); };
  const setPwd = (k, v) => { setPw(p => ({ ...p, [k]: v })); setPwErrors(p => ({ ...p, [k]: '' })); };

  const validateProfile = () => {
    const errs = {};
    if (!pf.name.trim() || pf.name.trim().length < 2) errs.name = 'Name must be at least 2 characters.';
    if (!pf.university.trim()) errs.university = 'University is required.';
    if (!pf.course.trim())     errs.course     = 'Course is required.';
    const s = Number(pf.semester);
    if (isNaN(s) || s < 1 || s > 8) errs.semester = 'Semester must be 1–8.';
    return errs;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = validateProfile();
    if (Object.keys(errs).length > 0) { setPfErrors(errs); return; }

    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name: pf.name.trim(), university: pf.university.trim(),
        course: pf.course.trim(), semester: Number(pf.semester),
        section: pf.section.trim(), rollNumber: pf.rollNumber.trim(),
      });
      const updatedUser = res.data.user;
      updateStoredUser(updatedUser);
      if (onUserUpdate) onUserUpdate(updatedUser);
      setEditing(false);
      toast.success('Profile updated successfully.');
    } catch (err) {
      if (err.errors) setPfErrors(err.errors);
      else setPfErrors({ general: err.message });
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Current password is required.';
    if (!pw.newPassword || pw.newPassword.length < 8) errs.newPassword = 'New password must be at least 8 characters.';
    if (pw.newPassword !== pw.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setPwSaving(true);
    try {
      await authAPI.changePassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
        confirmPassword: pw.confirmPassword,
      });
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
      setShowPwForm(false);
      toast.success('Password changed successfully.');
    } catch (err) {
      if (err.errors) setPwErrors(err.errors);
      else setPwErrors({ general: err.message });
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    toast.info('Signed out.');
    onLogout();
  };

  const displayUser = user || {};
  const initials = (displayUser.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>Profile</h1>
          <p>Your academic identity and account settings.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s3)' }}>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)} id="btn-edit-profile">
              <Edit2 size={12} aria-hidden="true" /> Edit Profile
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="btn-logout"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <LogOut size={12} aria-hidden="true" /> Sign Out
          </button>
        </div>
      </div>

      {/* Avatar + identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s6)', marginBottom: 'var(--s8)', padding: 'var(--s6)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
        <div style={{
          width: 64, height: 64, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: '#080808', flexShrink: 0,
        }} aria-hidden="true">{initials}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--fg-primary)', lineHeight: 1 }}>
            {displayUser.name || '—'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4 }}>{displayUser.email}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 2 }}>
            {displayUser.university} · {displayUser.course} · Sem {displayUser.semester}
          </div>
        </div>
      </div>

      {/* Profile form (view/edit) */}
      <div className="card" style={{ marginBottom: 'var(--s6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s6)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Academic Profile</div>
          {editing && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setPfErrors({}); }} id="btn-cancel-edit">
              <X size={11} aria-hidden="true" /> Cancel
            </button>
          )}
        </div>

        {pfErrors.general && <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--s4)' }}>{pfErrors.general}</div>}

        {editing ? (
          <form onSubmit={handleSaveProfile} noValidate id="form-profile">
            <div className="form-row">
              <div className={`form-group ${pfErrors.name ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-name">Full Name <span className="required" aria-hidden="true">*</span></label>
                <input id="prof-name" className={`form-input ${pfErrors.name ? 'input-error' : ''}`}
                  value={pf.name} onChange={e => setP('name', e.target.value)} placeholder="Full Name" />
                <FieldError msg={pfErrors.name} />
              </div>
              <div className={`form-group ${pfErrors.university ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-uni">University <span className="required" aria-hidden="true">*</span></label>
                <input id="prof-uni" className={`form-input ${pfErrors.university ? 'input-error' : ''}`}
                  value={pf.university} onChange={e => setP('university', e.target.value)} placeholder="University name" />
                <FieldError msg={pfErrors.university} />
              </div>
            </div>
            <div className="form-row">
              <div className={`form-group ${pfErrors.course ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-course">Course <span className="required" aria-hidden="true">*</span></label>
                <input id="prof-course" className={`form-input ${pfErrors.course ? 'input-error' : ''}`}
                  value={pf.course} onChange={e => setP('course', e.target.value)} placeholder="B.E. CSE" />
                <FieldError msg={pfErrors.course} />
              </div>
              <div className={`form-group ${pfErrors.semester ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-sem">Semester <span className="required" aria-hidden="true">*</span></label>
                <select id="prof-sem" className={`form-select ${pfErrors.semester ? 'input-error' : ''}`}
                  value={pf.semester} onChange={e => setP('semester', e.target.value)}>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
                <FieldError msg={pfErrors.semester} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="prof-section">Section</label>
                <input id="prof-section" className="form-input" value={pf.section} onChange={e => setP('section', e.target.value)} placeholder="Section A" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-roll">Roll Number</label>
                <input id="prof-roll" className="form-input" value={pf.rollNumber} onChange={e => setP('rollNumber', e.target.value)} placeholder="2310990123" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end', marginTop: 'var(--s4)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} id="btn-save-profile">
                {saving ? <><span className="spinner" aria-hidden="true" />Saving…</> : <><Save size={13} aria-hidden="true" />Save Changes</>}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
            {[
              { label: 'Full Name',    value: displayUser.name },
              { label: 'Email',        value: displayUser.email },
              { label: 'University',   value: displayUser.university },
              { label: 'Course',       value: displayUser.course },
              { label: 'Semester',     value: displayUser.semester ? `Semester ${displayUser.semester}` : '—' },
              { label: 'Section',      value: displayUser.section     || '—' },
              { label: 'Roll Number',  value: displayUser.rollNumber  || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 'var(--s4)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-primary)' }}>{value || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPwForm ? 'var(--s6)' : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <Lock size={12} aria-hidden="true" /> Security
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowPwForm(p => !p); setPwErrors({}); }} id="btn-toggle-pw">
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPwForm && (
          <form onSubmit={handleSavePw} noValidate id="form-change-password">
            {pwErrors.general && <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--s4)' }}>{pwErrors.general}</div>}
            {[
              { key: 'currentPassword', label: 'Current Password', id: 'pw-current' },
              { key: 'newPassword',      label: 'New Password (8+ chars)', id: 'pw-new' },
              { key: 'confirmPassword',  label: 'Confirm New Password', id: 'pw-confirm' },
            ].map(({ key, label, id }) => (
              <div key={key} className={`form-group ${pwErrors[key] ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor={id}>{label}</label>
                <input id={id} type="password" className={`form-input ${pwErrors[key] ? 'input-error' : ''}`}
                  value={pw[key]} onChange={e => setPwd(key, e.target.value)} autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} />
                <FieldError msg={pwErrors[key]} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={pwSaving} id="btn-save-password">
                {pwSaving ? <><span className="spinner" aria-hidden="true" />Updating…</> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
