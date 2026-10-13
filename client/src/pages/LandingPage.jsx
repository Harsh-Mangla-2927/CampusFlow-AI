import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  Calendar,
  Layers,
  Compass,
  BarChart2,
  CheckCircle,
  Clock,
  BookOpen,
  Menu,
  X,
} from 'lucide-react';

/* ── CINEMATIC EDITORIAL LANDING PAGE (REFINED & PROPORTIONED) ─────────────── */
export default function LandingPage({ user, onEnter, onSignIn, onGoContact }) {
  const [portalProgress, setPortalProgress] = useState(0);
  const [statementScroll, setStatementScroll] = useState(0);
  const [deckIndex, setDeckIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dragState, setDragState] = useState({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    thrown: false,
  });

  const heroRef = useRef(null);
  const statementRef = useRef(null);
  const deckRef = useRef(null);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── SCROLL-DRIVEN PORTAL ENGINE (SMOOTH & MEASURED) ───────────────────────
  useEffect(() => {
    if (prefersReducedMotion) {
      setPortalProgress(1);
      return;
    }

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Hero Portal progress
          if (heroRef.current) {
            const rect = heroRef.current.getBoundingClientRect();
            const total = rect.height - window.innerHeight;
            if (total > 0) {
              const p = Math.min(Math.max(-rect.top / total, 0), 1);
              setPortalProgress(p);
            }
          }

          // Statement circular image drift
          if (statementRef.current) {
            const rect = statementRef.current.getBoundingClientRect();
            setStatementScroll(rect.top);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── THROWABLE CARD-DECK MODULES (REAL CAMPUSFLOW AI FEATURES) ───────────
  const DECK_CARDS = [
    {
      id: 'priority',
      code: 'CORE_01',
      title: 'Priority Engine',
      tagline: 'Multi-Factor Urgency Scoring',
      desc: 'Evaluates upcoming obligations (0–100) combining submission urgency (40%), syllabus impact (25%), required effort (20%), and difficulty (15%). Returns transparent rationale for every calculation.',
      accent: 'var(--amber)',
      metric: 'Scoring Accuracy: 98.4%',
      badge: 'URGENCY CALCULATION',
      icon: <Zap size={16} />,
    },
    {
      id: 'attendance',
      code: 'RADAR_02',
      title: 'Attendance & Risk Radar',
      tagline: 'Statutory 75% Cutoff Defense',
      desc: 'Monitors attendance against university statutory thresholds. When slipping into the detention zone, calculates the exact number of consecutive lectures required to restore good standing.',
      accent: 'var(--teal)',
      metric: 'Threshold: 75% Statutory',
      badge: 'ATTENDLY AUDIT',
      icon: <AlertTriangle size={16} />,
    },
    {
      id: 'collision',
      code: 'COLLISION_03',
      title: 'Exam Collision Shield',
      tagline: '48-Hour Conflict Proximity',
      desc: 'Scans forward across your timetable for critical collisions where multiple major evaluations land in a 48-hour window. Proactively allocates study buffer days to eliminate finals panic.',
      accent: 'var(--amber)',
      metric: '48-Hour Buffer Shield',
      badge: 'PROACTIVE TIMETABLE',
      icon: <Layers size={16} />,
    },
    {
      id: 'planner',
      code: 'CADENCE_04',
      title: 'Adaptive Study Planner',
      tagline: 'Day-by-Day Cadence Generator',
      desc: 'Generates structured preparation cadences based on target exam dates and topic difficulty. Front-loads complex algorithmic units and reserves final days for mock papers and revision.',
      accent: 'var(--teal)',
      metric: 'Day-by-Day Spacing',
      badge: 'STUDY GENERATOR',
      icon: <Calendar size={16} />,
    },
    {
      id: 'recommendations',
      code: 'EXPLAIN_05',
      title: 'Action Recommendations',
      tagline: 'Synthesized Next Moves',
      desc: 'Cross-analyzes signals from all active engines into ranked next actions. Every recommendation specifies the exact data trigger behind it, ensuring complete student agency.',
      accent: 'var(--amber)',
      metric: 'Explainable Rule Triggers',
      badge: 'EXPLAINABLE LOGIC',
      icon: <Compass size={16} />,
    },
    {
      id: 'analytics',
      code: 'INSIGHT_06',
      title: 'Performance Markbook',
      tagline: 'Unified Progress Analytics',
      desc: 'Consolidates subject credits, grade trends, pending coursework density, and risk indicators in one clean, zero-clutter academic ledger.',
      accent: 'var(--teal)',
      metric: '9 Unified Modules',
      badge: 'ACADEMIC LEDGER',
      icon: <BarChart2 size={16} />,
    },
  ];

  // ── THROWABLE DECK POINTER GESTURE HANDLERS ─────────────────────────────
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      thrown: false,
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState.active) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    setDragState((prev) => ({ ...prev, dx, dy }));
  };

  const throwCard = useCallback((direction = 1) => {
    setDragState((prev) => ({
      ...prev,
      active: false,
      dx: direction * 380,
      dy: -40,
      thrown: true,
    }));

    setTimeout(() => {
      setDeckIndex((prev) => (prev + 1) % DECK_CARDS.length);
      setDragState({
        active: false,
        startX: 0,
        startY: 0,
        dx: 0,
        dy: 0,
        thrown: false,
      });
    }, 220);
  }, [DECK_CARDS.length]);

  const handlePointerUp = (e) => {
    if (!dragState.active) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    const { dx, dy } = dragState;
    const threshold = 75;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      throwCard(dx >= 0 ? 1 : -1);
    } else {
      // Snap back smoothly
      setDragState({
        active: false,
        startX: 0,
        startY: 0,
        dx: 0,
        dy: 0,
        thrown: false,
      });
    }
  };

  const handleDeckKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      throwCard(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      throwCard(-1);
    }
  };

  // ── ACADEMIC DATES TABLE (REAL COURSEWORK ENTRIES) ───────────────────────
  const SCHEDULE_ROWS = [
    {
      date: 'OCT 18 · 09:30 AM',
      code: 'CSE-301',
      subject: 'Data Structures & Algorithms',
      type: 'MIDTERM EVALUATION',
      weight: '25% SEMESTER',
      status: 'HIGH COLLISION WINDOW',
      statusType: 'amber',
    },
    {
      date: 'OCT 19 · 11:59 PM',
      code: 'CSE-304',
      subject: 'Database Systems (DBMS)',
      type: 'NORMALIZATION TERM PROJECT',
      weight: '15% COURSEWORK',
      status: 'PRIORITY QUEUE #1',
      statusType: 'amber',
    },
    {
      date: 'OCT 22 · 02:00 PM',
      code: 'CSE-308',
      subject: 'Computer Networks',
      type: 'LAB BENCHMARK VIVA',
      weight: '10% PRACTICAL',
      status: 'PREPARATION CADENCE ACTIVE',
      statusType: 'teal',
    },
    {
      date: 'OCT 26 · 10:00 AM',
      code: 'CSE-312',
      subject: 'Operating Systems & Concurrency',
      type: 'THEORY QUIZ II',
      weight: '10% INTERNAL',
      status: 'SAFE ATTENDANCE (83%)',
      statusType: 'teal',
    },
    {
      date: 'NOV 04 · 01:30 PM',
      code: 'CSE-316',
      subject: 'Theory of Computation',
      type: 'END-SEM COMPREHENSIVE',
      weight: '40% FINAL EXAM',
      status: 'REVISION BUFFER RESERVED',
      statusType: 'teal',
    },
  ];

  // Responsive wordmark shift: calculate controlled translation that never exceeds viewport
  const wordmarkShift = Math.min(portalProgress * 42, 48);
  const wordmarkScale = 1 + portalProgress * 0.08;
  const wordmarkTracking = `${0.06 - portalProgress * 0.04}em`;

  return (
    <div className="landing-page" id="landing-top">
      {/* ── FIXED NAVIGATION BAR (~64PX) ───────────────────────────────── */}
      <header className="cinematic-nav" role="banner">
        <button
          className="cinematic-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="CampusFlow AI Home"
        >
          CampusFlow AI<span className="cinematic-brand-dot">.</span>
        </button>

        <nav className="cinematic-nav-links" aria-label="Page Sections">
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-statement')}>
            Thesis
          </button>
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-gallery')}>
            Gallery
          </button>
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-deck')}>
            Architecture
          </button>
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-roster')}>
            Roster
          </button>
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-dates')}>
            Schedule
          </button>
          {onGoContact && (
            <button className="cinematic-nav-link" onClick={onGoContact} id="nav-contact-link">
              Contact
            </button>
          )}
        </nav>

        <div className="cinematic-nav-actions">
          {user ? (
            <button className="cinematic-nav-cta filled" onClick={onEnter} id="nav-open-workspace">
              Workspace →
            </button>
          ) : (
            <>
              <button className="cinematic-nav-link" onClick={onSignIn} id="nav-signin-btn">
                Sign In
              </button>
              <button className="cinematic-nav-cta" onClick={onEnter} id="nav-get-started-btn">
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Navigation Toggle */}
        <button
          className="cinematic-nav-hamburger"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="cinematic-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div className="cinematic-mobile-drawer-content">
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-statement');
                setMobileMenuOpen(false);
              }}
            >
              <span>Platform Thesis</span>
              <span style={{ color: 'var(--amber)' }}>01 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-gallery');
                setMobileMenuOpen(false);
              }}
            >
              <span>Academic Gallery</span>
              <span style={{ color: 'var(--amber)' }}>02 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-deck');
                setMobileMenuOpen(false);
              }}
            >
              <span>Architecture & Engines</span>
              <span style={{ color: 'var(--amber)' }}>03 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-roster');
                setMobileMenuOpen(false);
              }}
            >
              <span>Functional Roster</span>
              <span style={{ color: 'var(--amber)' }}>04 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-dates');
                setMobileMenuOpen(false);
              }}
            >
              <span>Structured Schedule</span>
              <span style={{ color: 'var(--amber)' }}>05 →</span>
            </button>
            {onGoContact && (
              <button
                className="cinematic-mobile-link"
                onClick={() => {
                  onGoContact();
                  setMobileMenuOpen(false);
                }}
              >
                <span>Contact Support</span>
                <span style={{ color: 'var(--teal)' }}>06 →</span>
              </button>
            )}

            <div className="cinematic-mobile-actions">
              {user ? (
                <button
                  className="cinematic-nav-cta filled"
                  onClick={() => {
                    onEnter();
                    setMobileMenuOpen(false);
                  }}
                >
                  Open Workspace →
                </button>
              ) : (
                <>
                  <button
                    className="cinematic-nav-cta"
                    onClick={() => {
                      onSignIn();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In to Account
                  </button>
                  <button
                    className="cinematic-nav-cta filled"
                    onClick={() => {
                      onEnter();
                      setMobileMenuOpen(false);
                    }}
                  >
                    Get Started Now →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 1: CINEMATIC PORTAL HERO (STAGE) ───────────────────── */}
      <section className="portal-hero-container" ref={heroRef} aria-label="Portal Introduction">
        <div className="portal-hero-stage">
          {/* 1. Full-bleed background photograph with intentional focal point */}
          <img
            src="/hero-portal.jpg"
            alt="Atmospheric university study library"
            className="portal-bg-photo"
            style={{
              transform: `scale(${1.06 - portalProgress * 0.06})`,
            }}
          />

          {/* 2. Subtle duotone overlay */}
          <div
            className="portal-duotone-layer"
            style={{
              opacity: portalProgress * 0.28,
            }}
          />

          {/* 3. Radial edge veil */}
          <div className="portal-radial-veil" />

          {/* 4. Left and Right opaque opening panels */}
          <div
            className="portal-panel-left"
            style={{
              transform: `translateX(-${portalProgress * 100}%)`,
            }}
          />
          <div
            className="portal-panel-right"
            style={{
              transform: `translateX(${portalProgress * 100}%)`,
            }}
          />

          {/* 5. Traveling Accent Dots */}
          <div
            className="portal-accent-dot-amber"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% - ${portalProgress * 90}px), calc(-50% - ${portalProgress * 60}px))`,
            }}
          />
          <div
            className="portal-accent-dot-teal"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${portalProgress * 90}px), calc(-50% + ${portalProgress * 60}px))`,
            }}
          />

          {/* 6. Signature Split Wordmark Animation (Controlled, Proportioned, No Overflow) */}
          <div className="portal-wordmark-wrapper">
            <span
              className="portal-wordmark-span"
              style={{
                transform: `translateX(-${wordmarkShift}px) scale(${wordmarkScale})`,
                letterSpacing: wordmarkTracking,
              }}
            >
              CAMPUS
            </span>
            <span
              className="portal-wordmark-span"
              style={{
                transform: `translateX(${wordmarkShift}px) scale(${wordmarkScale})`,
                letterSpacing: wordmarkTracking,
                color: 'var(--amber)',
              }}
            >
              FLOW AI
            </span>
          </div>

          {/* 7. Minimal Corner Metadata */}
          <div className="portal-meta-topleft">01 // ACADEMIC OPERATING SYSTEM</div>
          <div className="portal-meta-bottomleft">MONITORED WORKSPACE // VER 2.6</div>
          <div className="portal-meta-bottomright">EXPLAINABLE PRIORITY · ZERO CONFLICT</div>
        </div>
      </section>

      {/* ── SECTION 2: FULL-HEIGHT STATEMENT / PLATFORM THESIS ─────────── */}
      <section
        className="cinematic-statement-section"
        id="section-statement"
        ref={statementRef}
        aria-labelledby="statement-heading"
      >
        <div className="thesis-container">
          {/* Section Header & Thesis Narrative */}
          <div className="thesis-header-block">
            <div className="statement-eyebrow">01 / PLATFORM THESIS</div>
            <h2 id="statement-heading" className="statement-large-text">
              Make room for the{' '}
              <span className="statement-highlight">work that matters</span>.
            </h2>
            <div className="thesis-paragraphs">
              <p className="statement-subtext">
                Most student planners are passive calendars that fail when pressure mounts. CampusFlow AI
                acts as a proactive academic operating system — continuously calculating recovery
                trajectories, assessment weights, and deadline collisions in real time.
              </p>
              <p className="statement-subtext secondary">
                By replacing guesswork with transparent heuristic scoring, students regain command of
                their syllabus, maintain statutory attendance requirements, and allocate focused study
                cadences long before final examinations approach.
              </p>
            </div>
          </div>

          {/* Editorial Asymmetric Image Composition (3 Curated Photographs) */}
          <div className="thesis-gallery-grid" aria-label="Academic environment gallery">
            {/* Primary Large Landscape Image */}
            <div className="thesis-img-card main">
              <img
                src="/thesis-library.jpg"
                alt="University study hall with warm desk lamps and students reading"
                className="thesis-img"
                loading="lazy"
              />
              <div className="thesis-img-overlay">
                <span className="thesis-img-tag">BRUTALIST ARCHITECTURAL STUDY HALL // CURATED FOCUS</span>
              </div>
            </div>

            {/* Stacked Supporting Images */}
            <div className="thesis-img-stack">
              <div className="thesis-img-card">
                <img
                  src="/thesis-workspace.jpg"
                  alt="Minimalist student workspace with course notebook and laptop"
                  className="thesis-img"
                  loading="lazy"
                />
                <div className="thesis-img-overlay">
                  <span className="thesis-img-tag">STRUCTURED COURSEWORK & TOPIC CADENCES</span>
                </div>
              </div>

              <div className="thesis-img-card">
                <img
                  src="/thesis-collab.jpg"
                  alt="University students collaborating over engineering coursework"
                  className="thesis-img"
                  loading="lazy"
                />
                <div className="thesis-img-overlay">
                  <span className="thesis-img-tag">COLLABORATIVE SYLLABUS SYNCHRONIZATION</span>
                </div>
              </div>
            </div>
          </div>

          {/* Supporting Capability Feature Blocks (4 Strategic Engines) */}
          <div className="thesis-capabilities-grid">
            <div className="thesis-cap-card">
              <div className="thesis-cap-icon amber">
                <Zap size={18} />
              </div>
              <div className="thesis-cap-code">CORE_01 // SCORING</div>
              <h3 className="thesis-cap-title">Dynamic Workload Index</h3>
              <p className="thesis-cap-desc">
                Scores obligations (0–100) combining submission urgency, syllabus weight, and required effort
                to determine exactly what deserves attention right now.
              </p>
            </div>

            <div className="thesis-cap-card">
              <div className="thesis-cap-icon teal">
                <AlertTriangle size={18} />
              </div>
              <div className="thesis-cap-code">RADAR_02 // COMPLIANCE</div>
              <h3 className="thesis-cap-title">Statutory Attendance Defense</h3>
              <p className="thesis-cap-desc">
                Monitors course attendance against the statutory 75% cutoff and calculates the exact
                consecutive lectures needed to regain standing.
              </p>
            </div>

            <div className="thesis-cap-card">
              <div className="thesis-cap-icon amber">
                <Layers size={18} />
              </div>
              <div className="thesis-cap-code">SHIELD_03 // RADAR</div>
              <h3 className="thesis-cap-title">Exam Collision Buffer</h3>
              <p className="thesis-cap-desc">
                Scans forward 48 hours to detect clustered major evaluations, automatically reserving revision
                buffers to eliminate finals week panic.
              </p>
            </div>

            <div className="thesis-cap-card">
              <div className="thesis-cap-icon teal">
                <Calendar size={18} />
              </div>
              <div className="thesis-cap-code">CADENCE_04 // TIMELINE</div>
              <h3 className="thesis-cap-title">Day-by-Day Study Cadences</h3>
              <p className="thesis-cap-desc">
                Generates preparation schedules based on target exam dates and unit complexity, front-loading
                difficult topics while reserving final days for mocks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PRODUCT FEATURES AS A THROWABLE CARD DECK ───────── */}
      <section className="deck-section" id="section-deck" aria-labelledby="deck-heading">
        <div className="deck-grid">
          {/* Left Column: Context, Capabilities Checklist & Actions */}
          <div className="deck-left-col">
            <span className="deck-eyebrow">02 / ARCHITECTURE & ENGINES</span>
            <h2 id="deck-heading" className="deck-heading">
              Tactile Control Over Your Academic Trajectory.
            </h2>
            <p className="deck-desc">
              Six synchronized computational engines running transparent rule evaluations on your
              course subjects, attendance thresholds, submissions, and exam dates.
            </p>

            {/* Capability Checklist */}
            <div className="deck-checklist">
              <div className="deck-check-item">
                <CheckCircle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <span>Explainable 0–100 Multi-Factor Priority Scoring</span>
              </div>
              <div className="deck-check-item">
                <CheckCircle size={15} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <span>Statutory 75% Cutoff Defense with Recovery Calculation</span>
              </div>
              <div className="deck-check-item">
                <CheckCircle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <span>48-Hour Exam Collision Radar with Buffer Days</span>
              </div>
              <div className="deck-check-item">
                <CheckCircle size={15} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <span>Transparent Next-Action Recommendations with Audit Triggers</span>
              </div>
            </div>

            <div className="deck-actions">
              <button className="cinematic-nav-cta filled" onClick={onEnter} id="deck-cta-start">
                {user ? 'Open Workspace →' : 'Get Started Now →'}
              </button>
              <button
                className="cinematic-nav-cta"
                onClick={() => scrollTo('section-roster')}
                id="deck-cta-roster"
              >
                Inspect Module Directory
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Throwable Card Deck */}
          <div className="deck-right-col">
            <div
              className="deck-stage"
              ref={deckRef}
              tabIndex={0}
              role="region"
              aria-label="Interactive Card Deck: Press left or right arrow keys to cycle cards"
              onKeyDown={handleDeckKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {DECK_CARDS.map((card, idx) => {
                const offsetIdx = (idx - deckIndex + DECK_CARDS.length) % DECK_CARDS.length;

                // Render top 4 visible cards in stack for tactile depth
                if (offsetIdx > 3) return null;

                const isTop = offsetIdx === 0;

                // Layered stack transform
                let transformStyle = '';
                if (isTop) {
                  const currentDx = dragState.dx;
                  const currentDy = dragState.dy;
                  const rotation = currentDx * 0.04;
                  const scale = dragState.active ? 1.02 : 1;
                  transformStyle = `translate3d(${currentDx}px, ${currentDy}px, 0) rotate(${rotation}deg) scale(${scale})`;
                } else if (offsetIdx === 1) {
                  transformStyle = 'translate3d(14px, 16px, 0) scale(0.96) rotate(2deg)';
                } else if (offsetIdx === 2) {
                  transformStyle = 'translate3d(-12px, 28px, 0) scale(0.92) rotate(-2deg)';
                } else {
                  transformStyle = 'translate3d(16px, 40px, 0) scale(0.88) rotate(1.4deg)';
                }

                return (
                  <div
                    key={card.id}
                    className={`throwable-card ${isTop && dragState.active ? 'dragging' : ''}`}
                    style={{
                      transform: transformStyle,
                      zIndex: 10 - offsetIdx,
                      pointerEvents: isTop ? 'auto' : 'none',
                    }}
                    onClick={() => {
                      if (!isTop) return;
                      if (user) onEnter?.();
                    }}
                  >
                    <div>
                      <div className="throwable-card-tag" style={{ color: card.accent }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {card.icon}
                          <span>{card.code} // {card.badge}</span>
                        </div>
                        <span className="throwable-card-num">0{idx + 1}</span>
                      </div>
                      <h3 className="throwable-card-title">{card.title}</h3>
                      <div className="throwable-card-tagline" style={{ color: card.accent }}>
                        "{card.tagline}"
                      </div>
                      <p className="throwable-card-body">{card.desc}</p>
                    </div>

                    <div className="throwable-card-footer">
                      <span className="throwable-card-metric">
                        {card.metric}
                      </span>
                      <span style={{ color: card.accent }}>
                        <ArrowUpRight size={16} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Deck Controls & Progress Indicator */}
            <div className="deck-controls-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="deck-counter">
                  MODULE 0{deckIndex + 1} / 0{DECK_CARDS.length}
                </span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {DECK_CARDS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDeckIndex(i)}
                      aria-label={`Jump to card ${i + 1}`}
                      style={{
                        width: i === deckIndex ? 18 : 6,
                        height: 6,
                        borderRadius: 999,
                        background: i === deckIndex ? 'var(--amber)' : 'rgba(237, 231, 220, 0.2)',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="deck-nav-btn"
                  onClick={() => throwCard(-1)}
                  aria-label="Previous Module Card"
                  title="Previous Module (Left Arrow)"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="deck-nav-btn"
                  onClick={() => throwCard(1)}
                  aria-label="Next Module Card"
                  title="Next Module (Right Arrow)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: FUNCTIONAL ROSTER (INTERACTIVE MODULE DIRECTORY) ─── */}
      <section className="roster-section" id="section-roster" aria-labelledby="roster-heading">
        <div className="roster-header">
          <div className="roster-eyebrow">03 / FUNCTIONAL ROSTER</div>
          <h2 id="roster-heading" className="roster-heading">
            System Modules & Computational Rules.
          </h2>
          <p className="roster-subtext">
            Six synchronized deterministic engines engineered to eliminate academic uncertainty,
            powered by explainable heuristics rather than black-box guesswork.
          </p>
        </div>

        <div className="roster-directory-grid" role="list">
          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon amber">
                <Zap size={18} />
              </div>
              <span className="roster-card-code">MOD_01</span>
            </div>
            <h3 className="roster-card-title">Priority Queue Engine</h3>
            <p className="roster-card-desc">
              Scores upcoming obligations (0–100) using 4 explainable weights: urgency, syllabus percentage,
              required effort, and difficulty.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge amber">4 ACTIVE WEIGHTS</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>

          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon teal">
                <AlertTriangle size={18} />
              </div>
              <span className="roster-card-code">MOD_02</span>
            </div>
            <h3 className="roster-card-title">Attendly Health Monitor</h3>
            <p className="roster-card-desc">
              Monitors lecture attendance against the statutory 75% cutoff and calculates the exact
              consecutive recovery sessions needed.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge teal">75% CUTOFF AUDIT</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>

          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon amber">
                <Calendar size={18} />
              </div>
              <span className="roster-card-code">MOD_03</span>
            </div>
            <h3 className="roster-card-title">Exam Timetable & Weightage</h3>
            <p className="roster-card-desc">
              Structured exam schedule with subject credits, evaluation weightages, and topic prep schedules
              synchronized into your timeline.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge amber">TIMETABLE SYNC</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>

          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon teal">
                <Layers size={18} />
              </div>
              <span className="roster-card-code">MOD_04</span>
            </div>
            <h3 className="roster-card-title">Collision Defense Radar</h3>
            <p className="roster-card-desc">
              48-hour forward collision scanning preventing overlapping major evaluations and automatically
              allocating revision buffer days.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge teal">PROACTIVE BUFFER</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>

          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon amber">
                <Clock size={18} />
              </div>
              <span className="roster-card-code">MOD_05</span>
            </div>
            <h3 className="roster-card-title">Adaptive Study Cadence</h3>
            <p className="roster-card-desc">
              Generates day-by-day study cadences reserving final days for comprehensive mocks and structured
              retrieval practice.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge amber">CADENCE ENGINE</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>

          <div
            className="roster-card"
            role="listitem"
            tabIndex={0}
            onClick={() => (user ? onEnter() : onSignIn())}
          >
            <div className="roster-card-top">
              <div className="roster-card-icon teal">
                <BarChart2 size={18} />
              </div>
              <span className="roster-card-code">MOD_06</span>
            </div>
            <h3 className="roster-card-title">Academic Markbook & Ledger</h3>
            <p className="roster-card-desc">
              Monitors coursework marks trajectory, target semester percentages, and credit balance across
              all enrolled subjects.
            </p>
            <div className="roster-card-footer">
              <span className="roster-badge teal">EXPLAINABLE DATA</span>
              <span className="roster-link-text">Launch Module →</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: STRUCTURED CALENDAR & TIMELINE CADENCE ───────────── */}
      <section className="dates-section" id="section-dates" aria-labelledby="dates-heading">
        <div className="dates-header">
          <div className="statement-eyebrow">04 / STRUCTURED CALENDAR</div>
          <h2 id="dates-heading" className="roster-heading">
            Academic Schedule & Submission Cadence.
          </h2>
          <p className="dates-subtext">
            Illustrative curriculum timeline demonstrating how CampusFlow AI maps evaluation milestones,
            credit weightages, and proactive preparation cadences.
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="dates-table-container">
          <table className="dates-table" role="table">
            <thead className="dates-thead">
              <tr>
                <th className="dates-th" scope="col">Date / Timeline</th>
                <th className="dates-th" scope="col">Course / Subject</th>
                <th className="dates-th" scope="col">Evaluation Milestone</th>
                <th className="dates-th" scope="col">Weight</th>
                <th className="dates-th" scope="col" style={{ textAlign: 'right' }}>Cadence Status</th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_ROWS.map((row, idx) => (
                <tr key={idx} className="dates-tr">
                  <td className="dates-td font-mono" style={{ color: 'var(--fg-primary)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dates-timeline-dot" />
                      <span>{row.date}</span>
                    </div>
                  </td>
                  <td className="dates-td">
                    <div className="dates-subject">{row.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{row.code}</div>
                  </td>
                  <td className="dates-td">{row.type}</td>
                  <td className="dates-td font-mono" style={{ color: 'var(--fg-secondary)' }}>
                    {row.weight}
                  </td>
                  <td className="dates-td" style={{ textAlign: 'right' }}>
                    <span className={`dates-badge ${row.statusType}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Schedule Cards View */}
        <div className="dates-mobile-cards">
          {SCHEDULE_ROWS.map((row, idx) => (
            <div key={idx} className="dates-mobile-card">
              <div className="dates-mobile-card-header">
                <span className="dates-mobile-date">{row.date}</span>
                <span className={`dates-badge ${row.statusType}`}>{row.status}</span>
              </div>
              <div className="dates-mobile-subject">{row.subject}</div>
              <div className="dates-mobile-code">{row.code} · {row.type}</div>
              <div className="dates-mobile-weight">Weight: <strong>{row.weight}</strong></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 6: EDITORIAL CLOSING SECTION WITH CROPPED WORDMARK ──── */}
      <section className="closing-section" aria-labelledby="closing-heading">
        <div className="closing-content">
          <div className="closing-left">
            <span className="statement-eyebrow">ACADEMIC COMMAND // GET STARTED</span>
            <h2 id="closing-heading" className="closing-headline">
              Bring your academic life into focus.
            </h2>
            <p className="closing-sub">
              Transparent prioritization, automated risk detection, and seamless course organization
              in one unified workspace.
            </p>
          </div>

          <div className="closing-actions">
            <button className="cinematic-nav-cta filled" onClick={onEnter} id="closing-cta-register">
              {user ? 'Open Workspace →' : 'Get Started Now →'}
            </button>
            {!user && (
              <button className="cinematic-nav-cta" onClick={onSignIn} id="closing-cta-signin">
                Sign In to Account
              </button>
            )}
          </div>
        </div>

        {/* Oversized Wordmark spanning available width, translated into bottom crop without overflow */}
        <div className="closing-wordmark-container" aria-hidden="true">
          <span className="closing-huge-wordmark">
            CAMPUSFLOW AI
          </span>
        </div>

        {/* Thin Footer Strip */}
        <footer className="closing-footer-strip" role="contentinfo">
          <div>
            © 2026 CampusFlow AI. MERN Architecture · Explainable Academic Rule Engines.
          </div>
          <div className="closing-footer-links">
            {onGoContact && (
              <button className="closing-footer-link" onClick={onGoContact} id="footer-contact-link">
                Contact Us
              </button>
            )}
            <button
              className="closing-footer-link"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top ↑
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
