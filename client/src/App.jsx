import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { getStoredUser, updateStoredUser, clearAuth } from './services/api';

// Lazy load all pages for code splitting + isolated error handling
const LandingPage          = lazy(() => import('./pages/LandingPage'));
const LoginPage            = lazy(() => import('./pages/LoginPage'));
const RegisterPage         = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage   = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage    = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage        = lazy(() => import('./pages/DashboardPage'));
const SubjectsPage         = lazy(() => import('./pages/SubjectsPage'));
const TasksPage            = lazy(() => import('./pages/TasksPage'));
const ExamsPage            = lazy(() => import('./pages/ExamsPage'));
const AttendancePage       = lazy(() => import('./pages/AttendancePage'));
const StudyPlannerPage     = lazy(() => import('./pages/StudyPlannerPage'));
const AnalyticsPage        = lazy(() => import('./pages/AnalyticsPage'));
const RecommendationsPage  = lazy(() => import('./pages/RecommendationsPage'));
const ProfilePage          = lazy(() => import('./pages/ProfilePage'));
const Sidebar              = lazy(() => import('./components/Sidebar'));
const Topbar               = lazy(() => import('./components/Topbar'));

// Route mapping table
const PROTECTED_ROUTES = {
  '/dashboard':            'dashboard',
  '/subjects':             'subjects',
  '/tasks':                'tasks',
  '/exams':                'exams',
  '/attendance':           'attendance',
  '/attendly':             'attendance',
  '/attendly/attendance':  'attendance',
  '/planner':              'planner',
  '/study-planner':        'planner',
  '/analytics':            'analytics',
  '/recommendations':      'recommendations',
  '/profile':              'profile',
};

const PAGE_TO_PATH = {
  dashboard:       '/dashboard',
  subjects:        '/subjects',
  tasks:           '/tasks',
  exams:           '/exams',
  attendance:      '/attendance',
  planner:         '/planner',
  analytics:       '/analytics',
  recommendations: '/recommendations',
  profile:         '/profile',
};

// Branded loading spinner — zero external deps
function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, background: '#E8FF00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontWeight: 900, fontSize: 13, color: '#080808' }}>CF</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, background: '#E8FF00', animation: `pulse 1.2s ${i * 0.15}s ease-in-out infinite`, opacity: 1 - i * 0.3 }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,60%,100%{transform:scale(1)} 30%{transform:scale(1.5)} }`}</style>
    </div>
  );
}

function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, background: '#E8FF00', animation: `pulse 1.2s ${i * 0.15}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

function normalizePath(p) {
  if (!p) return '/';
  const clean = p.toLowerCase().replace(/\/+$/, '');
  return clean || '/';
}

function App() {
  // Synchronous session check on boot
  const [user, setUser] = useState(() => getStoredUser());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState(null);

  // Compute initial route based on URL and user session
  const [routeState, setRouteState] = useState(() => {
    const rawPath = normalizePath(window.location.pathname);
    const stored = getStoredUser();

    if (stored) {
      if (rawPath === '/login' || rawPath === '/signin' || rawPath === '/register' || rawPath === '/signup') {
        return { view: 'app', activePage: 'dashboard', path: '/dashboard', replace: true };
      }
      if (PROTECTED_ROUTES[rawPath]) {
        return { view: 'app', activePage: PROTECTED_ROUTES[rawPath], path: rawPath, replace: false };
      }
      if (rawPath === '/') {
        return { view: 'app', activePage: 'dashboard', path: '/dashboard', replace: false };
      }
      return { view: 'app', activePage: 'dashboard', path: '/dashboard', replace: true };
    } else {
      if (rawPath === '/login' || rawPath === '/signin') {
        return { view: 'login', activePage: 'dashboard', path: '/login', replace: false };
      }
      if (rawPath === '/register' || rawPath === '/signup') {
        return { view: 'register', activePage: 'dashboard', path: '/register', replace: false };
      }
      if (rawPath === '/forgot-password' || rawPath === '/forgotpassword') {
        return { view: 'forgot-password', activePage: 'dashboard', path: '/forgot-password', replace: false };
      }
      if (rawPath === '/reset-password' || rawPath === '/resetpassword') {
        const token = new URLSearchParams(window.location.search).get('token') || '';
        return { view: 'reset-password', activePage: 'dashboard', path: window.location.pathname + window.location.search, token, replace: false };
      }
      if (PROTECTED_ROUTES[rawPath]) {
        // Protected route accessed by guest: redirect to login but remember target
        return { view: 'login', activePage: 'dashboard', path: '/login', redirectFrom: rawPath, replace: true };
      }
      return { view: 'landing', activePage: 'dashboard', path: '/', replace: false };
    }
  });

  const { view, activePage } = routeState;

  // Sync browser URL if initial route required replaceState
  useEffect(() => {
    if (routeState.replace && window.location.pathname !== routeState.path) {
      window.history.replaceState(null, '', routeState.path);
    }
    if (routeState.redirectFrom) {
      setReturnUrl(routeState.redirectFrom);
    }
  }, []);

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const onPopState = () => {
      const rawPath = normalizePath(window.location.pathname);
      const currentUser = getStoredUser();

      if (currentUser) {
        if (PROTECTED_ROUTES[rawPath]) {
          setRouteState({ view: 'app', activePage: PROTECTED_ROUTES[rawPath], path: rawPath });
        } else if (rawPath === '/login' || rawPath === '/register') {
          setRouteState({ view: 'app', activePage: 'dashboard', path: '/dashboard' });
          window.history.replaceState(null, '', '/dashboard');
        } else {
          setRouteState({ view: 'app', activePage: 'dashboard', path: '/dashboard' });
        }
      } else {
        if (rawPath === '/login' || rawPath === '/signin') {
          setRouteState({ view: 'login', activePage: 'dashboard', path: '/login' });
        } else if (rawPath === '/register' || rawPath === '/signup') {
          setRouteState({ view: 'register', activePage: 'dashboard', path: '/register' });
        } else if (rawPath === '/forgot-password' || rawPath === '/forgotpassword') {
          setRouteState({ view: 'forgot-password', activePage: 'dashboard', path: '/forgot-password' });
        } else if (rawPath === '/reset-password' || rawPath === '/resetpassword') {
          const token = new URLSearchParams(window.location.search).get('token') || '';
          setRouteState({ view: 'reset-password', activePage: 'dashboard', path: window.location.pathname + window.location.search, token });
        } else if (PROTECTED_ROUTES[rawPath]) {
          setReturnUrl(rawPath);
          setRouteState({ view: 'login', activePage: 'dashboard', path: '/login' });
          window.history.replaceState(null, '', '/login');
        } else {
          setRouteState({ view: 'landing', activePage: 'dashboard', path: '/' });
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handle session expiry
  useEffect(() => {
    const handleAuthExpired = () => {
      clearAuth();
      setUser(null);
      setReturnUrl(window.location.pathname);
      setRouteState({ view: 'login', activePage: 'dashboard', path: '/login' });
      window.history.pushState(null, '', '/login');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  // Navigation handlers
  const navigateTo = useCallback((newView, newPage, path) => {
    setRouteState({ view: newView, activePage: newPage, path });
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setMobileOpen(false);
  }, []);

  const handleNavigate = useCallback((page) => {
    const path = PAGE_TO_PATH[page] || '/dashboard';
    navigateTo('app', page, path);
  }, [navigateTo]);

  const handleGoLogin = useCallback(() => {
    navigateTo('login', 'dashboard', '/login');
  }, [navigateTo]);

  const handleGoRegister = useCallback(() => {
    navigateTo('register', 'dashboard', '/register');
  }, [navigateTo]);

  const handleGoLanding = useCallback(() => {
    navigateTo('landing', 'dashboard', '/');
  }, [navigateTo]);

  const handleGoForgotPassword = useCallback(() => {
    navigateTo('forgot-password', 'dashboard', '/forgot-password');
  }, [navigateTo]);

  const handleGoResetPassword = useCallback((token) => {
    const path = token ? `/reset-password?token=${token}` : '/reset-password';
    setRouteState({ view: 'reset-password', activePage: 'dashboard', path, token });
    if (window.location.pathname + window.location.search !== path) {
      window.history.pushState(null, '', path);
    }
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    const targetPath = returnUrl && PROTECTED_ROUTES[returnUrl] ? returnUrl : '/dashboard';
    const targetPage = PROTECTED_ROUTES[targetPath] || 'dashboard';
    setReturnUrl(null);
    navigateTo('app', targetPage, targetPath);
  }, [returnUrl, navigateTo]);

  const handleLogout = useCallback(() => {
    clearAuth();
    setUser(null);
    navigateTo('landing', 'dashboard', '/');
  }, [navigateTo]);

  const handleUserUpdate = useCallback((updatedUser) => {
    setUser(updatedUser);
    updateStoredUser(updatedUser);
  }, []);

  // ── PUBLIC VIEWS ──────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <Suspense fallback={<Spinner />}>
        <LandingPage
          user={user}
          onEnter={user ? () => handleNavigate('dashboard') : handleGoRegister}
          onSignIn={user ? () => handleNavigate('dashboard') : handleGoLogin}
        />
      </Suspense>
    );
  }

  if (view === 'login') {
    return (
      <Suspense fallback={<Spinner />}>
        <LoginPage
          onLogin={handleLogin}
          onGoRegister={handleGoRegister}
          onGoLanding={handleGoLanding}
          onGoForgotPassword={handleGoForgotPassword}
        />
      </Suspense>
    );
  }

  if (view === 'register') {
    return (
      <Suspense fallback={<Spinner />}>
        <RegisterPage
          onLogin={handleLogin}
          onGoLogin={handleGoLogin}
          onGoLanding={handleGoLanding}
        />
      </Suspense>
    );
  }

  if (view === 'forgot-password') {
    return (
      <Suspense fallback={<Spinner />}>
        <ForgotPasswordPage
          onGoLogin={handleGoLogin}
          onGoLanding={handleGoLanding}
        />
      </Suspense>
    );
  }

  if (view === 'reset-password') {
    return (
      <Suspense fallback={<Spinner />}>
        <ResetPasswordPage
          token={routeState.token}
          onGoLogin={handleGoLogin}
          onGoForgotPassword={handleGoForgotPassword}
        />
      </Suspense>
    );
  }

  // ── AUTHENTICATED APP ─────────────────────────────────────────
  const PAGE_COMPONENTS = {
    dashboard:       <DashboardPage onNavigate={handleNavigate} />,
    subjects:        <SubjectsPage />,
    tasks:           <TasksPage />,
    exams:           <ExamsPage />,
    attendance:      <AttendancePage />,
    planner:         <StudyPlannerPage />,
    analytics:       <AnalyticsPage />,
    recommendations: <RecommendationsPage />,
    profile:         <ProfilePage user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />,
  };

  return (
    <div className="app-shell">
      <Suspense fallback={null}>
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          user={user}
          onLogout={handleLogout}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      </Suspense>
      <div className="main-content">
        <Suspense fallback={null}>
          <Topbar
            activePage={activePage}
            onMobileToggle={() => setMobileOpen(o => !o)}
            mobileOpen={mobileOpen}
          />
        </Suspense>
        <main role="main">
          <Suspense fallback={<PageSpinner />}>
            {PAGE_COMPONENTS[activePage] || PAGE_COMPONENTS.dashboard}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
