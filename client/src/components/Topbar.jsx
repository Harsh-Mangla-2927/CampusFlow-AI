import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { intelligenceAPI } from '../services/api';

const PAGE_TITLES = {
  dashboard:       'Dashboard',
  subjects:        'Subjects',
  tasks:           'Tasks',
  exams:           'Exams',
  attendance:      'Attendance',
  planner:         'Study Planner',
  analytics:       'Analytics',
  recommendations: 'Recommendations',
  profile:         'Profile',
};

function Topbar({ activePage, onMobileToggle, mobileOpen }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // fetch health score quietly
    intelligenceAPI.getDashboard()
      .then((res) => setHealth(res.data?.academicHealth ?? null))
      .catch(() => {});
  }, [activePage]);

  const healthColor = health === null ? 'var(--fg-faint)'
    : health >= 75 ? 'var(--success)'
    : health >= 50 ? 'var(--warning)'
    : 'var(--danger)';

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

        <span className="topbar-title" aria-current="page">
          {PAGE_TITLES[activePage] || activePage}
        </span>
      </div>

      <div className="topbar-right">
        {health !== null && (
          <div
            className="health-badge"
            title="Academic Health Score"
            aria-label={`Academic health: ${health}%`}
          >
            <div
              style={{ width: 6, height: 6, borderRadius: 0, background: healthColor }}
              aria-hidden="true"
            />
            <span style={{ color: healthColor, fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 13 }}>
              {health}%
            </span>
            <span style={{ color: 'var(--fg-faint)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Health
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
