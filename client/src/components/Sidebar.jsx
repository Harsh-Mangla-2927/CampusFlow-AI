import React from 'react';
import {
  LayoutDashboard, BookOpen, CheckSquare, FileText,
  ClipboardList, Calendar, BarChart2, Zap, User, LogOut,
} from 'lucide-react';
import { clearAuth } from '../services/api';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Academic',
    items: [
      { id: 'subjects',   label: 'Subjects',   icon: BookOpen },
      { id: 'tasks',      label: 'Tasks',       icon: CheckSquare },
      { id: 'exams',      label: 'Exams',       icon: FileText },
      { id: 'attendance', label: 'Attendance',  icon: ClipboardList },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { id: 'planner',         label: 'Study Planner',    icon: Calendar },
      { id: 'analytics',       label: 'Analytics',        icon: BarChart2 },
      { id: 'recommendations', label: 'Recommendations',  icon: Zap },
    ],
  },
  {
    label: 'Account',
    items: [{ id: 'profile', label: 'Profile', icon: User }],
  },
];

function Sidebar({ activePage, onNavigate, user, onLogout, mobileOpen, onMobileClose }) {
  const handleLogout = () => {
    clearAuth();
    onLogout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={onMobileClose}
          role="presentation"
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">
            <div className="sidebar-brand-icon" aria-hidden="true">CF</div>
            <div className="sidebar-brand-name">CampusFlow</div>
          </div>
          <div className="sidebar-brand-tagline">Academic Intelligence Platform</div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav" aria-label="Page navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`sidebar-item${activePage === id ? ' active' : ''}`}
                  onClick={() => { onNavigate(id); onMobileClose?.(); }}
                  id={`nav-${id}`}
                  aria-current={activePage === id ? 'page' : undefined}
                  aria-label={label}
                >
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar" aria-hidden="true">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-meta">
                  {user.course ? `${user.course} · Sem ${user.semester}` : user.email}
                </div>
              </div>
            </div>
          )}
          <button
            className="btn btn-ghost w-full btn-sm"
            onClick={handleLogout}
            id="btn-sidebar-logout"
            style={{ justifyContent: 'flex-start', gap: 'var(--s3)', color: 'var(--fg-faint)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--fg-faint)'}
          >
            <LogOut size={13} strokeWidth={1.8} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
