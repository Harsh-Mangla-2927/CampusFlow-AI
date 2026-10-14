import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { intelligenceAPI } from '../services/api';

const PAGE_META = {
  dashboard:       { section: 'Overview',     title: 'Dashboard' },
  subjects:        { section: 'Academic',     title: 'Subjects' },
  tasks:           { section: 'Academic',     title: 'Tasks' },
  exams:           { section: 'Academic',     title: 'Exams' },
  records:         { section: 'Academic',     title: 'Academic Records' },
  attendance:      { section: 'Academic',     title: 'Academic Records' },
  planner:         { section: 'Intelligence', title: 'Study Planner' },
  analytics:       { section: 'Intelligence', title: 'Analytics' },
  recommendations: { section: 'Intelligence', title: 'Recommendations' },
  profile:         { section: 'Account',      title: 'Profile & Settings' },
};

function Topbar({ activePage, onMobileToggle, mobileOpen, user, onNavigate }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    intelligenceAPI.getDashboard()
      .then((res) => setHealth(res.data?.academicHealth ?? null))
      .catch(() => {});
  }, [activePage]);

  const healthColor = health === null ? 'var(--fg-faint)'
    : health >= 75 ? 'var(--success)'
    : health >= 50 ? 'var(--warning)'
    : 'var(--danger)';

  const meta = PAGE_META[activePage] || { section: 'CampusFlow', title: activePage };

  const avatarUrl = user?.profilePicture
    ? (user.profilePicture.startsWith('http') || user.profilePicture.startsWith('data:')
        ? user.profilePicture
        : user.profilePicture)
    : null;

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        {/* Mobile hamburger */}
        <button
          className="topbar-hamburger"
          onClick={onMobileToggle}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileOpen}
          id="topbar-hamburger"
        >
          {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>

        {/* Restrained breadcrumb navigation to eliminate repeated page headings */}
        <div className="topbar-breadcrumb" aria-label="Breadcrumb">
          <span className="topbar-breadcrumb-section">{meta.section}</span>
          <ChevronRight size={12} className="topbar-breadcrumb-sep" aria-hidden="true" />
          <span className="topbar-breadcrumb-current" aria-current="page">{meta.title}</span>
        </div>
      </div>

      <div className="topbar-right">
        {health !== null && (
          <div
            className="health-badge"
            title="Academic Health Score based on attendance, pending tasks, and exams"
            aria-label={`Academic health: ${health}%`}
          >
            <div
              style={{ width: 6, height: 6, borderRadius: 0, background: healthColor }}
              aria-hidden="true"
            />
            <span style={{ color: healthColor, fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13 }}>
              {health}%
            </span>
            <span style={{ color: 'var(--fg-muted)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Health
            </span>
          </div>
        )}

        {user && onNavigate && (
          <button
            type="button"
            className="topbar-user-pill"
            onClick={() => onNavigate('profile')}
            title="Account Profile"
            aria-label="View user profile"
          >
            <div className="topbar-user-avatar" aria-hidden="true">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                user.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <span className="topbar-user-name">{user.name?.split(' ')[0] || 'Account'}</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default Topbar;

