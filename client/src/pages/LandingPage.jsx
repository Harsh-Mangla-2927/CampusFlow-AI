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
function EditorialSectionLabel({ number, title, subtitle }) {
  return (
    <div className="editorial-section-label">
      <span className="label-badge">[{number}]</span>
      <span className="label-sep">—</span>
      <span className="label-name">{title}</span>
      {subtitle && <span className="label-sub">/ {subtitle}</span>}
    </div>
  );
}

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
  const galleryReelRef = useRef(null);
  const [reelPaused, setReelPaused] = useState(false);

  // Platform Thesis scroll-driven active step state & refs
  const [activeThesisStep, setActiveThesisStep] = useState(0);
  const thesisPillarRefs = useRef([]);

  const scrollToPillar = (idx) => {
    setActiveThesisStep(idx);
    const target = thesisPillarRefs.current[idx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Section 06: Structured Calendar Progression Timeline state
  const [selectedMilestoneIndex, setSelectedMilestoneIndex] = useState(0);

  const stepTimeline = (direction = 1) => {
    setSelectedMilestoneIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return SCHEDULE_ROWS.length - 1;
      if (next >= SCHEDULE_ROWS.length) return 0;
      return next;
    });
  };

  const nudgeGallery = (direction = 1) => {
    if (!galleryReelRef.current) return;
    galleryReelRef.current.scrollBy({ left: direction * 400, behavior: 'smooth' });
  };

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

          // Track active Platform Thesis pillar based on viewport focus
          if (thesisPillarRefs.current && thesisPillarRefs.current.length) {
            const focusLine = window.innerHeight * 0.42;
            let bestIdx = 0;
            let minDistance = Infinity;
            thesisPillarRefs.current.forEach((el, idx) => {
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const mid = rect.top + rect.height * 0.35;
              const dist = Math.abs(mid - focusLine);
              if (dist < minDistance) {
                minDistance = dist;
                bestIdx = idx;
              }
            });
            setActiveThesisStep(bestIdx);
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

  // ── ACADEMIC PHOTOGRAPHY REEL (9 DISTINCT ACADEMIC ENVIRONMENTS) ─────────
  const GALLERY_ITEMS = [
    {
      id: '01',
      code: '01 // CONCENTRATION',
      title: 'Brutalist Reading Rooms',
      sub: 'Silent study archives & deep work',
      img: '/thesis-library.jpg',
      alt: 'Students focused on study in university reading hall',
    },
    {
      id: '02',
      code: '02 // COMPUTATION',
      title: 'Systems & Code Architecture',
      sub: 'Laboratory debugging & project builds',
      img: '/gallery-coding.jpg',
      alt: 'University computer science students coding in modern terminal lab',
    },
    {
      id: '03',
      code: '03 // MAPPING',
      title: 'Syllabus Topic Cadences',
      sub: 'Structured coursework mapping & notes',
      img: '/thesis-workspace.jpg',
      alt: 'Structured coursework notebook, pens, and laptop',
    },
    {
      id: '04',
      code: '04 // ARCHITECTURE',
      title: 'Modern Campus Quad',
      sub: 'Transition between lecture complexes',
      img: '/gallery-campus.jpg',
      alt: 'Modern minimalist university campus architecture and walking students',
    },
    {
      id: '05',
      code: '05 // SYNTHESIS',
      title: 'Collaborative Problem Solving',
      sub: 'Engineering milestone synchronization',
      img: '/thesis-collab.jpg',
      alt: 'Engineering students discussing complex coursework tasks',
    },
    {
      id: '06',
      code: '06 // EVALUATION',
      title: 'Deep Examination Revision',
      sub: 'Multi-textbook reference & theory buffer',
      img: '/gallery-exam.jpg',
      alt: 'University student focused on exam preparation at library wooden desk',
    },
    {
      id: '07',
      code: '07 // DISCOURSE',
      title: 'Interactive Academic Seminars',
      sub: 'Coursework debates & architecture reviews',
      img: '/gallery-seminar.jpg',
      alt: 'University students in seminar discussion with system architecture whiteboard',
    },
    {
      id: '08',
      code: '08 // PREPARATION',
      title: 'Terminal Revision Buffer',
      sub: 'Dedicated individual focus workstation',
      img: '/auth-space.jpg',
      alt: 'Minimalist desk setup with academic terminal',
    },
    {
      id: '09',
      code: '09 // ATMOSPHERE',
      title: 'Scholarly Communal Spaces',
      sub: 'Continuous focus & academic momentum',
      img: '/statement-circle.jpg',
      alt: 'Students studying together in warm university hall',
    },
  ];

  // ── PLATFORM THESIS EDITORIAL CHAPTERS ────────────────────────────────────
  const THESIS_PILLARS = [
    {
      id: 'understand',
      num: '01',
      code: '01 — UNDERSTAND',
      shortLabel: 'UNDERSTAND',
      phaseLabel: 'PHASE 01 // COURSE & ATTENDANCE LEDGER',
      title: 'Unified Course & Attendance Architecture',
      desc: 'Consolidates every registered subject, credit weight, syllabus scope, and per-session attendance record into a single verified ledger. Real-time margin calculators enforce the statutory 75% cutoff so you know your safety threshold before missing a lecture.',
      tags: ['Subject Ledgers', 'Statutory 75% Defense', 'Margin Calculator'],
      systemAudit: 'ATTENDLY CORE PROTOCOL',
      metricA: { label: 'Statutory Target', value: '75.0% Mandatory' },
      metricB: { label: 'Recovery Margin', value: '+3 Buffer Sessions' },
    },
    {
      id: 'prioritize',
      num: '02',
      code: '02 — PRIORITIZE',
      shortLabel: 'PRIORITIZE',
      phaseLabel: 'PHASE 02 // 0–100 PRIORITY SCORING',
      title: 'Explainable 0–100 Priority Scoring',
      desc: 'Replaces arbitrary to-do lists with transparent mathematical scoring. Every assignment, viva, and project is ranked using syllabus weight, time to deadline, and pending workload density. Audit triggers explain the exact rationale behind every top-ranked item.',
      tags: ['Dynamic Priority Index', 'Collision Radar', 'Audit Triggers'],
      systemAudit: 'PRIORITY MATRIX V2',
      metricA: { label: 'Score Formula', value: 'Urgency + Syllabus + Load' },
      metricB: { label: 'Audit Triggers', value: 'Transparent Rationale' },
    },
    {
      id: 'plan',
      num: '03',
      code: '03 — PLAN',
      shortLabel: 'PLAN',
      phaseLabel: 'PHASE 03 // CADENCE & COLLISION PROTOCOLS',
      title: 'Day-by-Day Study Cadences & Buffers',
      desc: 'Generates balanced revision allocations based on exam proximity and syllabus complexity. The engine reserves mandatory 48-hour buffers prior to major midterms and finals, preventing deadline collisions and late-night panic.',
      tags: ['Study Planner', '48-Hr Buffer Reserve', 'Target Milestones'],
      systemAudit: 'CADENCE ENGINE PROTOCOL',
      metricA: { label: 'Collision Defense', value: '48h Exam Lockout' },
      metricB: { label: 'Daily Pacing', value: 'Balanced Sessions' },
    },
  ];

  // ── ACADEMIC PROGRESSION MILESTONES (ILLUSTRATIVE CURRICULUM CADENCE) ────
  const SCHEDULE_ROWS = [
    {
      id: 'm1',
      date: 'OCT 18 · 09:30 AM',
      dayLabel: 'SATURDAY',
      code: 'CSE-301',
      subject: 'Data Structures & Algorithms',
      type: 'MIDTERM EVALUATION',
      weight: '25% SEMESTER',
      status: 'HIGH COLLISION WINDOW',
      statusType: 'amber',
      isNext: true,
      cadenceRule: '48h Collision Defense active — mandatory study block allocated 2 days prior to prevent midterm overlap.',
      bufferDays: '48H BUFFER',
      prepStage: 'MOCK EXAM PHASE',
    },
    {
      id: 'm2',
      date: 'OCT 19 · 11:59 PM',
      dayLabel: 'SUNDAY',
      code: 'CSE-304',
      subject: 'Database Systems (DBMS)',
      type: 'NORMALIZATION TERM PROJECT',
      weight: '15% COURSEWORK',
      status: 'PRIORITY QUEUE #1',
      statusType: 'amber',
      isNext: false,
      cadenceRule: 'Top ranked in Dynamic Priority Matrix due to 15% course weight & 24h deadline proximity.',
      bufferDays: 'DEADLINE WINDOW',
      prepStage: 'FINAL VERIFICATION',
    },
    {
      id: 'm3',
      date: 'OCT 22 · 02:00 PM',
      dayLabel: 'WEDNESDAY',
      code: 'CSE-308',
      subject: 'Computer Networks',
      type: 'LAB BENCHMARK VIVA',
      weight: '10% PRACTICAL',
      status: 'PREPARATION CADENCE ACTIVE',
      statusType: 'teal',
      isNext: false,
      cadenceRule: 'Lab evaluation viva slotted with 3-day spaced repetition retrieval review.',
      bufferDays: '72H HORIZON',
      prepStage: 'RETRIEVAL PRACTICE',
    },
    {
      id: 'm4',
      date: 'OCT 26 · 10:00 AM',
      dayLabel: 'SUNDAY',
      code: 'CSE-312',
      subject: 'Operating Systems & Concurrency',
      type: 'THEORY QUIZ II',
      weight: '10% INTERNAL',
      status: 'SAFE ATTENDANCE (83%)',
      statusType: 'teal',
      isNext: false,
      cadenceRule: 'Attendance verified at 83% (+4 session margin above statutory 75% cutoff threshold).',
      bufferDays: 'SCHEDULED CADENCE',
      prepStage: 'CONCEPT REVIEW',
    },
    {
      id: 'm5',
      date: 'NOV 04 · 01:30 PM',
      dayLabel: 'TUESDAY',
      code: 'CSE-316',
      subject: 'Theory of Computation',
      type: 'END-SEM COMPREHENSIVE',
      weight: '40% FINAL EXAM',
      status: 'REVISION BUFFER RESERVED',
      statusType: 'teal',
      isNext: false,
      cadenceRule: 'Final exam buffer locked: 5 mandatory uninterrupted revision days with zero pending submissions.',
      bufferDays: '5-DAY BUFFER',
      prepStage: 'SYLLABUS RETENTION',
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
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-gallery')}>
            Gallery
          </button>
          <button className="cinematic-nav-link" onClick={() => scrollTo('section-statement')}>
            Thesis
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
                scrollTo('section-gallery');
                setMobileMenuOpen(false);
              }}
            >
              <span>Academic Gallery</span>
              <span style={{ color: 'var(--accent)' }}>02 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-statement');
                setMobileMenuOpen(false);
              }}
            >
              <span>Platform Thesis</span>
              <span style={{ color: 'var(--accent)' }}>03 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-deck');
                setMobileMenuOpen(false);
              }}
            >
              <span>Architecture & Engines</span>
              <span style={{ color: 'var(--accent)' }}>04 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-roster');
                setMobileMenuOpen(false);
              }}
            >
              <span>Functional Roster</span>
              <span style={{ color: 'var(--accent)' }}>05 →</span>
            </button>
            <button
              className="cinematic-mobile-link"
              onClick={() => {
                scrollTo('section-dates');
                setMobileMenuOpen(false);
              }}
            >
              <span>Structured Schedule</span>
              <span style={{ color: 'var(--accent)' }}>06 →</span>
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
                <span style={{ color: 'var(--accent)' }}>07 →</span>
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

          {/* 7. Editorial Hero Narrative (Primary Headline & CTAs) */}
          <div
            className="portal-editorial-content"
            style={{
              opacity: portalProgress > 0.12 ? Math.min((portalProgress - 0.12) * 2.2, 1) : 0,
              transform: `translateY(${Math.max(20 - portalProgress * 20, 0)}px)`,
              pointerEvents: portalProgress > 0.35 ? 'auto' : 'none',
            }}
          >
            <EditorialSectionLabel
              number="01"
              title="ACADEMIC OPERATING SYSTEM"
              subtitle="FOCUS PORTAL"
            />

            <h1 className="portal-editorial-title">
              <span className="headline-block">Make room for the</span>{' '}
              <span className="accent">work that matters</span>.
            </h1>

            <p className="portal-editorial-subtitle">
              Your academic life, intelligently organized. Plan your coursework, understand your progress,
              and stay ahead of what matters without last-minute panic.
            </p>

            <div className="portal-editorial-actions">
              <button
                className="cinematic-nav-cta filled"
                onClick={onEnter}
                id="hero-cta-primary"
              >
                {user ? 'Open Workspace →' : 'Get Started Now →'}
              </button>
              <button
                className="cinematic-nav-cta"
                onClick={() => scrollTo('section-gallery')}
                id="hero-cta-secondary"
              >
                Explore Gallery ↓
              </button>
            </div>
          </div>

          {/* 8. Initial Scroll Cue */}
          <div
            className="portal-initial-cue"
            style={{
              opacity: Math.max(1 - portalProgress * 3.5, 0),
            }}
          >
            <div className="portal-initial-sub">
              Your academic life, intelligently organized.
            </div>
            <div className="portal-initial-scroll">
              <span className="portal-scroll-dot" />
              <span>Scroll to open portal</span>
            </div>
          </div>

          {/* 9. Minimal Corner Metadata */}
          <div className="portal-meta-topleft">01 // ACADEMIC OPERATING SYSTEM</div>
          <div className="portal-meta-bottomleft">MONITORED WORKSPACE // VER 2.6</div>
          <div className="portal-meta-bottomright">EXPLAINABLE PRIORITY · ZERO CONFLICT</div>
        </div>
      </section>

      {/* ── SECTION 02: CINEMATIC CURVED HORIZONTAL FILM REEL GALLERY ─── */}
      <section
        className="academic-gallery-section"
        id="section-gallery"
        aria-labelledby="gallery-heading"
      >
        <div className="gallery-container">
          <div className="gallery-header-block">
            <div className="gallery-header-row">
              <div>
                <EditorialSectionLabel
                  number="02"
                  title="ACADEMIC IMAGERY"
                  subtitle="FOCUS CADENCE"
                />
                <h2 id="gallery-heading" className="section-heading">
                  Atmospheres of deep academic <span className="accent">focus</span>.
                </h2>
                <p className="section-subtext" style={{ marginTop: 12 }}>
                  A curated visual reel across genuine university environments — reading archives, software laboratories, collaborative studios, and examination buffers.
                </p>
              </div>
              <div className="gallery-reel-controls" aria-label="Gallery reel navigation controls">
                <button
                  type="button"
                  className="gallery-nav-btn"
                  onClick={() => nudgeGallery(-1)}
                  aria-label="Previous gallery images"
                  title="Previous image"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-btn"
                  onClick={() => nudgeGallery(1)}
                  aria-label="Next gallery images"
                  title="Next image"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width curved horizontal film reel viewport */}
        <div
          className="gallery-reel-viewport"
          ref={galleryReelRef}
          onMouseEnter={() => setReelPaused(true)}
          onMouseLeave={() => setReelPaused(false)}
          role="region"
          aria-label="Continuous academic photography reel"
          tabIndex={0}
        >
          <div className={`gallery-reel-track ${reelPaused ? 'is-paused' : ''}`}>
            {/* Primary set of 9 distinct photographs */}
            {GALLERY_ITEMS.map((item, idx) => (
              <div
                key={`reel-item-${item.id}`}
                className={`gallery-reel-card gallery-arc-step-${idx % 5}`}
              >
                <div className="gallery-reel-img-wrapper">
                  <img
                    src={item.img}
                    alt={item.alt}
                    className="gallery-reel-img"
                    loading="lazy"
                  />
                  <div className="gallery-reel-overlay">
                    <span className="gallery-reel-tag">{item.code}</span>
                    <div className="gallery-reel-caption">{item.title}</div>
                    <div className="gallery-reel-sub">{item.sub}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Seamless looping duplicate with aria-hidden to prevent duplicate screen reader noise */}
            {GALLERY_ITEMS.map((item, idx) => (
              <div
                key={`reel-dup-${item.id}`}
                className={`gallery-reel-card gallery-arc-step-${idx % 5}`}
                aria-hidden="true"
              >
                <div className="gallery-reel-img-wrapper">
                  <img
                    src={item.img}
                    alt=""
                    className="gallery-reel-img"
                    loading="lazy"
                  />
                  <div className="gallery-reel-overlay">
                    <span className="gallery-reel-tag">{item.code}</span>
                    <div className="gallery-reel-caption">{item.title}</div>
                    <div className="gallery-reel-sub">{item.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 03: PLATFORM THESIS (SCROLL-DRIVEN EDITORIAL TIMELINE) ── */}
      <section
        className="cinematic-statement-section"
        id="section-statement"
        ref={statementRef}
        aria-labelledby="statement-heading"
      >
        <div className="thesis-editorial-container">
          <div className="thesis-editorial-layout">
            {/* Left Column: Asymmetric Editorial Heading & Dynamic Chapter Monitor */}
            <div className="thesis-editorial-left">
              <EditorialSectionLabel
                number="03"
                title="PLATFORM THESIS"
                subtitle="ARCHITECTURAL FOUNDATION"
              />
              <h2 id="statement-heading" className="section-heading">
                Your semester.<br />
                <span className="accent">Under control.</span>
              </h2>
              <p className="section-subtext thesis-editorial-subtext">
                CampusFlow AI brings academic responsibilities into a clearer system, helping students understand their workload, prioritize important tasks, and plan their next steps.
              </p>

              {/* Dynamic Active Chapter Monitor Block */}
              <div className="thesis-chapter-monitor" aria-live="polite">
                <div className="thesis-chapter-top">
                  <div className="thesis-chapter-num font-mono">
                    {THESIS_PILLARS[activeThesisStep]?.num || '01'}
                  </div>
                  <div className="thesis-chapter-phase">
                    {THESIS_PILLARS[activeThesisStep]?.phaseLabel || 'PHASE 01'}
                  </div>
                </div>

                <div className="thesis-chapter-desc">
                  {THESIS_PILLARS[activeThesisStep]?.title}
                </div>

                {/* 3-Part Step Selector Tabs */}
                <div className="thesis-step-selector" role="tablist" aria-label="Thesis chapters">
                  {THESIS_PILLARS.map((pillar, idx) => (
                    <button
                      key={pillar.id}
                      role="tab"
                      aria-selected={activeThesisStep === idx}
                      aria-controls={`thesis-panel-${idx}`}
                      className={`thesis-step-btn ${activeThesisStep === idx ? 'is-active' : ''}`}
                      onClick={() => scrollToPillar(idx)}
                      type="button"
                    >
                      <span className="thesis-step-code">{pillar.num}</span>
                      <span className="thesis-step-label">{pillar.shortLabel}</span>
                    </button>
                  ))}
                </div>

                {/* Connected Progress Bar */}
                <div className="thesis-progress-track">
                  <div
                    className="thesis-progress-bar"
                    style={{ width: `${((activeThesisStep + 1) / THESIS_PILLARS.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="thesis-editorial-action">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => scrollTo('section-deck')}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  type="button"
                >
                  Architecture & Engines ↓
                </button>
              </div>
            </div>

            {/* Right Column: Overlapping Editorial Stack */}
            <div className="thesis-editorial-stack" role="region" aria-label="Thesis functional pillars">
              {THESIS_PILLARS.map((pillar, idx) => {
                const isActive = activeThesisStep === idx;
                const isPassed = activeThesisStep > idx;

                const statusClass = isActive
                  ? 'is-active'
                  : isPassed
                  ? 'is-passed'
                  : 'is-upcoming';

                return (
                  <div
                    key={pillar.id}
                    id={`thesis-panel-${idx}`}
                    ref={(el) => (thesisPillarRefs.current[idx] = el)}
                    className={`thesis-panel-card ${statusClass}`}
                    style={{ '--card-index': idx }}
                    tabIndex={0}
                    onClick={() => setActiveThesisStep(idx)}
                  >
                    <div className="thesis-panel-header">
                      <span className="thesis-panel-code">{pillar.code}</span>
                      <div className={`thesis-panel-status ${isActive ? 'active' : ''}`}>
                        <span className={`thesis-status-dot ${isActive ? 'pulse' : ''}`} />
                        <span>{isActive ? `ACTIVE CHAPTER // ${pillar.num}` : `CHAPTER ${pillar.num}`}</span>
                      </div>
                    </div>

                    <h3 className="thesis-panel-title">{pillar.title}</h3>
                    <p className="thesis-panel-desc">{pillar.desc}</p>

                    {/* Deterministic Engine Telemetry Micro-Readout */}
                    <div className="thesis-engine-readout">
                      <div className="thesis-readout-header">
                        <span>{pillar.systemAudit}</span>
                        <span>DETERMINISTIC RULE MATRIX</span>
                      </div>
                      <div className="thesis-readout-grid">
                        <div className="thesis-readout-metric">
                          <span className="thesis-readout-label">{pillar.metricA.label}</span>
                          <span className="thesis-readout-val">{pillar.metricA.value}</span>
                        </div>
                        <div className="thesis-readout-metric">
                          <span className="thesis-readout-label">{pillar.metricB.label}</span>
                          <span className="thesis-readout-val">{pillar.metricB.value}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capability Tags */}
                    <div className="thesis-panel-tags">
                      {pillar.tags.map((tag, tIdx) => (
                        <span key={tIdx} className="thesis-pill">{tag}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PRODUCT FEATURES AS A THROWABLE CARD DECK ───────── */}
      <section className="deck-section" id="section-deck" aria-labelledby="deck-heading">
        <div className="deck-grid">
          {/* Left Column: Context, Capabilities Checklist & Actions */}
          <div className="deck-left-col">
            <EditorialSectionLabel
              number="04"
              title="SYSTEM ARCHITECTURE"
              subtitle="COMPUTATIONAL ENGINES"
            />
            <h2 id="deck-heading" className="section-heading">
              Tactile control over your academic <span className="accent">trajectory</span>.
            </h2>
            <p className="section-subtext deck-desc">
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
          <EditorialSectionLabel
            number="05"
            title="FUNCTIONAL ROSTER"
            subtitle="MODULE DIRECTORY"
          />
          <h2 id="roster-heading" className="section-heading">
            System modules & computational <span className="accent">rules</span>.
          </h2>
          <p className="section-subtext">
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

      {/* ── SECTION 06: STRUCTURED CALENDAR & PROGRESSION TIMELINE ───────────── */}
      <section className="dates-section" id="section-dates" aria-labelledby="dates-heading">
        {/* Header Row: Eyebrow, Heading, Subtext & Navigation Toolbar */}
        <div className="dates-header-row">
          <div className="dates-header-col">
            <EditorialSectionLabel
              number="06"
              title="STRUCTURED CALENDAR"
              subtitle="PROGRESSION TIMELINE"
            />
            <h2 id="dates-heading" className="section-heading">
              Academic schedule & submission <span className="accent">cadence</span>.
            </h2>
            <p className="section-subtext dates-subtext">
              Illustrative curriculum timeline demonstrating how CampusFlow AI maps evaluation milestones,
              credit weightages, and proactive preparation cadences.
            </p>
          </div>

          <div className="dates-controls" aria-label="Timeline navigation controls">
            <div className="dates-step-indicator">
              <span className="dates-step-dot" />
              <span>
                MILESTONE 0{selectedMilestoneIndex + 1} / 0{SCHEDULE_ROWS.length} · {SCHEDULE_ROWS[selectedMilestoneIndex]?.code}
              </span>
            </div>
            <button
              type="button"
              className="dates-nav-btn"
              onClick={() => stepTimeline(-1)}
              aria-label="Previous academic milestone"
              title="Previous milestone"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="dates-nav-btn"
              onClick={() => stepTimeline(1)}
              aria-label="Next academic milestone"
              title="Next milestone"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Desktop Horizontal Progression Timeline Track */}
        <div className="timeline-track-wrapper" role="region" aria-label="Interactive academic progression track">
          {/* Continuous Rail Line with dynamic progression fill */}
          <div className="timeline-rail-container" aria-hidden="true">
            <div
              className="timeline-rail-fill"
              style={{
                width: `${((selectedMilestoneIndex + 1) / SCHEDULE_ROWS.length) * 100}%`,
              }}
            />
          </div>

          {/* 5-Column Milestone Grid */}
          <div className="timeline-milestones-grid" role="tablist" aria-label="Academic milestones">
            {SCHEDULE_ROWS.map((row, idx) => {
              const isSelected = selectedMilestoneIndex === idx;
              const isNext = row.isNext;

              return (
                <div
                  key={row.id}
                  role="tab"
                  tabIndex={0}
                  aria-selected={isSelected}
                  aria-label={`${row.code}: ${row.subject} on ${row.date}`}
                  className={`timeline-milestone-item ${isSelected ? 'is-selected' : ''} ${isNext ? 'is-next' : ''}`}
                  onClick={() => setSelectedMilestoneIndex(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedMilestoneIndex(idx);
                    }
                  }}
                >
                  {/* Milestone Node on Progression Line */}
                  <div className="timeline-node-wrapper">
                    <div className="timeline-node-box">
                      <div className="timeline-node-inner" />
                    </div>
                    <span className="timeline-node-label">
                      {isNext ? 'NEXT EVALUATION' : `STAGE 0${idx + 1}`}
                    </span>
                  </div>

                  {/* Connected Editorial Card */}
                  <div className="timeline-milestone-card">
                    <div className="timeline-card-header">
                      <span className="timeline-date-stamp">{row.date}</span>
                      {isNext && <span className="timeline-next-badge">NEXT</span>}
                    </div>

                    <div className="timeline-code-row">
                      <span className="timeline-course-code">{row.code}</span>
                      <span className="timeline-weight-pill">{row.weight}</span>
                    </div>

                    <h3 className="timeline-subject-title">{row.subject}</h3>
                    <div className="timeline-milestone-type">{row.type}</div>

                    <div className={`timeline-status-badge ${row.statusType}`}>
                      <span className="dates-timeline-dot" style={{ width: 5, height: 5 }} />
                      <span>{row.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Active Milestone Cadence Inspector Panel */}
        <div className="timeline-inspector-panel" aria-live="polite">
          <div className="inspector-left">
            <span className="inspector-eyebrow">
              {SCHEDULE_ROWS[selectedMilestoneIndex]?.isNext ? 'NEXT CRITICAL MILESTONE INSPECTION' : 'CADENCE STAGE INSPECTION'}
            </span>
            <h3 className="inspector-title">
              {SCHEDULE_ROWS[selectedMilestoneIndex]?.code} · {SCHEDULE_ROWS[selectedMilestoneIndex]?.subject}
            </h3>
            <div className="inspector-meta">
              <span>{SCHEDULE_ROWS[selectedMilestoneIndex]?.date}</span>
              <span>·</span>
              <span>{SCHEDULE_ROWS[selectedMilestoneIndex]?.type}</span>
              <span>·</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{SCHEDULE_ROWS[selectedMilestoneIndex]?.weight}</span>
            </div>
          </div>

          <div className="inspector-right">
            <span className="inspector-rule-title">ENGINE CADENCE PROTOCOL</span>
            <p className="inspector-rule-text">
              {SCHEDULE_ROWS[selectedMilestoneIndex]?.cadenceRule}
            </p>
            <div className="inspector-tags">
              <span className={`inspector-tag ${SCHEDULE_ROWS[selectedMilestoneIndex]?.statusType}`} style={{ color: 'var(--accent)' }}>
                {SCHEDULE_ROWS[selectedMilestoneIndex]?.status}
              </span>
              <span className="inspector-tag">
                {SCHEDULE_ROWS[selectedMilestoneIndex]?.bufferDays}
              </span>
              <span className="inspector-tag">
                {SCHEDULE_ROWS[selectedMilestoneIndex]?.prepStage}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Vertical Progression Stream */}
        <div className="timeline-vertical-stream" role="region" aria-label="Mobile academic progression timeline">
          <div className="timeline-vertical-line" aria-hidden="true" />
          {SCHEDULE_ROWS.map((row, idx) => {
            const isSelected = selectedMilestoneIndex === idx;
            const isNext = row.isNext;

            return (
              <div
                key={`mob-${row.id}`}
                className="timeline-vertical-item"
                onClick={() => setSelectedMilestoneIndex(idx)}
              >
                <div className={`timeline-vertical-node ${isNext ? 'is-next' : ''} ${isSelected ? 'is-selected' : ''}`}>
                  <div className="timeline-vertical-dot" />
                </div>

                <div className={`timeline-vertical-card ${isNext ? 'is-next' : ''}`}>
                  <div className="timeline-card-header">
                    <span className="timeline-date-stamp">{row.date}</span>
                    {isNext && <span className="timeline-next-badge">NEXT</span>}
                  </div>

                  <div className="timeline-code-row">
                    <span className="timeline-course-code">{row.code}</span>
                    <span className="timeline-weight-pill">{row.weight}</span>
                  </div>

                  <h3 className="timeline-subject-title" style={{ minHeight: 'auto' }}>{row.subject}</h3>
                  <div className="timeline-milestone-type">{row.type}</div>

                  <div className={`timeline-status-badge ${row.statusType}`}>
                    <span className="dates-timeline-dot" style={{ width: 5, height: 5 }} />
                    <span>{row.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 6: EDITORIAL CLOSING SECTION WITH BALANCED CTAS ────── */}
      <section className="closing-section" aria-labelledby="closing-heading">
        <div className="closing-content">
          <div className="closing-left">
            <EditorialSectionLabel
              number="07"
              title="ACADEMIC COMMAND"
              subtitle="GET STARTED"
            />
            <h2 id="closing-heading" className="section-heading closing-headline">
              Build a better rhythm for your <span className="accent">academic life</span>.
            </h2>
            <p className="section-subtext closing-sub">
              Transparent prioritization, automated risk detection, and seamless course organization
              in one unified workspace. Plan ahead, protect your standing, and study without panic.
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
