import React, { useState, useRef } from 'react';
import { clearAuth, authAPI, updateStoredUser } from '../services/api';
import { useToast } from '../components/Toast';
import LogoutModal from '../components/LogoutModal';
import {
  User,
  LogOut,
  Edit2,
  Save,
  X,
  Lock,
  Camera,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div className="field-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <AlertCircle size={11} aria-hidden="true" />
      <span>{msg}</span>
    </div>
  );
}

function ProfilePage({ user, onLogout, onUserUpdate }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Logout modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutBtnRef = useRef(null);

  // Profile photo state
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

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

  const setP = (k, v) => {
    setPf(p => ({ ...p, [k]: v }));
    setPfErrors(p => ({ ...p, [k]: '' }));
  };

  const setPwd = (k, v) => {
    setPw(p => ({ ...p, [k]: v }));
    setPwErrors(p => ({ ...p, [k]: '' }));
  };

  // ── PHOTO UPLOAD HANDLERS ──────────────────────────────────────
  const handleFileChange = (e) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (3MB limit)
    const MAX_SIZE = 3 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPhotoError('Image file size cannot exceed 3MB. Please choose a smaller photo.');
      toast.error('Image file exceeds the 3MB limit.');
      return;
    }

    // Validate type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(file.type)) {
      setPhotoError('Unsupported format. Please select a JPEG, PNG, or WebP image.');
      toast.error('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const cancelPhotoSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setUploadingPhoto(true);
    setPhotoError(null);

    const formData = new FormData();
    formData.append('photo', selectedFile);

    try {
      const res = await authAPI.uploadProfilePhoto(formData);
      const updatedUser = res.data.user;

      updateStoredUser(updatedUser);
      if (onUserUpdate) onUserUpdate(updatedUser);

      toast.success('Profile photo updated successfully.');
      cancelPhotoSelection();
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload profile photo.');
      toast.error(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const res = await authAPI.deleteProfilePhoto();
      const updatedUser = res.data.user;

      updateStoredUser(updatedUser);
      if (onUserUpdate) onUserUpdate(updatedUser);

      toast.success('Profile photo removed.');
      cancelPhotoSelection();
    } catch (err) {
      setPhotoError(err.message || 'Failed to remove profile photo.');
      toast.error(err.message || 'Failed to remove profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── PROFILE UPDATE HANDLERS ────────────────────────────────────
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
    if (Object.keys(errs).length > 0) {
      setPfErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name: pf.name.trim(),
        university: pf.university.trim(),
        course: pf.course.trim(),
        semester: Number(pf.semester),
        section: pf.section.trim(),
        rollNumber: pf.rollNumber.trim(),
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

  // ── PASSWORD CHANGE HANDLERS ───────────────────────────────────
  const handleSavePw = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Current password is required.';
    if (!pw.newPassword || pw.newPassword.length < 8) errs.newPassword = 'New password must be at least 8 characters.';
    if (pw.newPassword !== pw.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }

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

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    clearAuth();
    toast.info('Signed out successfully.');
    onLogout();
  };

  const displayUser = user || {};
  const initials = (displayUser.name || 'U')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const currentAvatarSrc = previewUrl || displayUser.profilePicture;

  return (
    <div className="page-container">
      {/* Restrained Section Kicker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', marginBottom: 'var(--s2)' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          fontFamily: 'var(--font-mono)',
        }}>
          ACCOUNT MANAGEMENT &amp; IDENTITY
        </span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Profile &amp; Settings</h1>
          <p>Manage your academic identity, profile photo, and account security.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center' }}>
          {!editing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditing(true)}
              id="btn-edit-profile"
            >
              <Edit2 size={12} aria-hidden="true" /> Edit Details
            </button>
          )}
          <button
            ref={logoutBtnRef}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowLogoutModal(true)}
            id="btn-logout"
            style={{ color: 'var(--danger)', borderColor: 'var(--border)' }}
          >
            <LogOut size={12} aria-hidden="true" /> Sign Out
          </button>
        </div>
      </div>

      {/* Avatar & Identity Hero Section */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 'var(--s6)',
        marginBottom: 'var(--s6)',
        padding: 'var(--s6)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--bg-elevated)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Avatar Display */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              background: currentAvatarSrc ? '#000000' : 'var(--accent)',
              border: '2px solid var(--border-bright)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '1.8rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            }}
            aria-hidden="true"
          >
            {currentAvatarSrc ? (
              <img
                src={currentAvatarSrc}
                alt={displayUser.name || 'User avatar'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              initials
            )}
          </div>

          {/* Quick Camera Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Choose a profile picture"
            aria-label="Upload profile photo"
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-bright)',
              color: 'var(--fg-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Camera size={13} strokeWidth={2} />
          </button>
        </div>

        {/* User Info & Photo Action Buttons */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
            fontWeight: 900,
            color: 'var(--fg-primary)',
            lineHeight: 1.1,
          }}>
            {displayUser.name || 'Student'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
            {displayUser.email}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 2 }}>
            {displayUser.university} · {displayUser.course} · Sem {displayUser.semester}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            id="profile-photo-input"
          />

          {/* Photo Controls Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
            {previewUrl ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  id="btn-save-photo"
                >
                  {uploadingPhoto ? (
                    <><span className="spinner" aria-hidden="true" /> Saving Photo…</>
                  ) : (
                    <><Upload size={12} aria-hidden="true" /> Confirm &amp; Save Photo</>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={cancelPhotoSelection}
                  disabled={uploadingPhoto}
                  id="btn-cancel-photo"
                >
                  <X size={12} aria-hidden="true" /> Discard
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  id="btn-choose-photo"
                >
                  <Camera size={12} aria-hidden="true" />
                  {displayUser.profilePicture ? 'Replace Photo' : 'Upload Photo'}
                </button>
                {displayUser.profilePicture && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    id="btn-remove-photo"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={12} aria-hidden="true" /> Remove
                  </button>
                )}
                <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontFamily: 'var(--font-mono)' }}>
                  JPEG, PNG, WebP · Max 3MB
                </span>
              </>
            )}
          </div>

          {photoError && (
            <div style={{ marginTop: 'var(--s3)', color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={13} aria-hidden="true" />
              <span>{photoError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Academic Profile Card */}
      <div className="card" style={{ marginBottom: 'var(--s6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s6)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            Academic Profile
          </div>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setEditing(false); setPfErrors({}); }}
              id="btn-cancel-edit"
            >
              <X size={11} aria-hidden="true" /> Cancel
            </button>
          )}
        </div>

        {pfErrors.general && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--s4)' }}>
            {pfErrors.general}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSaveProfile} noValidate id="form-profile">
            <div className="form-row">
              <div className={`form-group ${pfErrors.name ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-name">Full Name <span className="required" aria-hidden="true">*</span></label>
                <input
                  id="prof-name"
                  className={`form-input ${pfErrors.name ? 'input-error' : ''}`}
                  value={pf.name}
                  onChange={e => setP('name', e.target.value)}
                  placeholder="Full Name"
                />
                <FieldError msg={pfErrors.name} />
              </div>
              <div className={`form-group ${pfErrors.university ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-uni">University <span className="required" aria-hidden="true">*</span></label>
                <input
                  id="prof-uni"
                  className={`form-input ${pfErrors.university ? 'input-error' : ''}`}
                  value={pf.university}
                  onChange={e => setP('university', e.target.value)}
                  placeholder="University name"
                />
                <FieldError msg={pfErrors.university} />
              </div>
            </div>
            <div className="form-row">
              <div className={`form-group ${pfErrors.course ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-course">Course <span className="required" aria-hidden="true">*</span></label>
                <input
                  id="prof-course"
                  className={`form-input ${pfErrors.course ? 'input-error' : ''}`}
                  value={pf.course}
                  onChange={e => setP('course', e.target.value)}
                  placeholder="B.E. CSE"
                />
                <FieldError msg={pfErrors.course} />
              </div>
              <div className={`form-group ${pfErrors.semester ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor="prof-sem">Semester <span className="required" aria-hidden="true">*</span></label>
                <select
                  id="prof-sem"
                  className={`form-select ${pfErrors.semester ? 'input-error' : ''}`}
                  value={pf.semester}
                  onChange={e => setP('semester', e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
                <FieldError msg={pfErrors.semester} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="prof-section">Section</label>
                <input
                  id="prof-section"
                  className="form-input"
                  value={pf.section}
                  onChange={e => setP('section', e.target.value)}
                  placeholder="Section A"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="prof-roll">Roll Number</label>
                <input
                  id="prof-roll"
                  className="form-input"
                  value={pf.rollNumber}
                  onChange={e => setP('rollNumber', e.target.value)}
                  placeholder="2310990123"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end', marginTop: 'var(--s4)' }}>
              <button type="submit" className="btn btn-primary" disabled={saving} id="btn-save-profile">
                {saving ? (
                  <><span className="spinner" aria-hidden="true" /> Saving…</>
                ) : (
                  <><Save size={13} aria-hidden="true" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s4)' }}>
            {[
              { label: 'Full Name',    value: displayUser.name },
              { label: 'Email',        value: displayUser.email },
              { label: 'University',   value: displayUser.university },
              { label: 'Course',       value: displayUser.course },
              { label: 'Semester',     value: displayUser.semester ? `Semester ${displayUser.semester}` : '—' },
              { label: 'Section',      value: displayUser.section || '—' },
              { label: 'Roll Number',  value: displayUser.rollNumber || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: 'var(--s4)', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--fg-primary)', fontWeight: 600 }}>
                  {value || '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Security Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPwForm ? 'var(--s6)' : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <Lock size={12} aria-hidden="true" /> Account Security
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setShowPwForm(p => !p); setPwErrors({}); }}
            id="btn-toggle-pw"
          >
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPwForm && (
          <form onSubmit={handleSavePw} noValidate id="form-change-password">
            {pwErrors.general && (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--s4)' }}>
                {pwErrors.general}
              </div>
            )}
            {[
              { key: 'currentPassword', label: 'Current Password', id: 'pw-current' },
              { key: 'newPassword',     label: 'New Password (8+ chars)', id: 'pw-new' },
              { key: 'confirmPassword', label: 'Confirm New Password', id: 'pw-confirm' },
            ].map(({ key, label, id }) => (
              <div key={key} className={`form-group ${pwErrors[key] ? 'has-error' : ''}`}>
                <label className="form-label" htmlFor={id}>{label}</label>
                <input
                  id={id}
                  type="password"
                  className={`form-input ${pwErrors[key] ? 'input-error' : ''}`}
                  value={pw[key]}
                  onChange={e => setPwd(key, e.target.value)}
                  autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
                />
                <FieldError msg={pwErrors[key]} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 'var(--s3)', justifyContent: 'flex-end', marginTop: 'var(--s4)' }}>
              <button type="submit" className="btn btn-primary" disabled={pwSaving} id="btn-save-password">
                {pwSaving ? <><span className="spinner" aria-hidden="true" /> Updating…</> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Accessible Branded Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        triggerRef={logoutBtnRef}
      />
    </div>
  );
}

export default ProfilePage;
