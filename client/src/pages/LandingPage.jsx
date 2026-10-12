import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Zap,
  AlertTriangle,
  Calendar,
  Layers,
  CheckCircle,
  BarChart2,
  Clock,
  ShieldCheck,
  Activity,
  Compass,
} from 'lucide-react';

/* ── KINETIC LANDING PAGE ─────────────────────────────────── */
function LandingPage({ user, onEnter, onSignIn }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const ENGINES = [
    {
      num: '01',
      title: 'Priority Engine',
      tagline: '"What should I work on right now?"',
      desc: 'Scores every academic obligation (0–100) based on deadline urgency, required effort, syllabus weight, and difficulty. Returns a transparent plain-English rationale for every calculation.',
      icon: <Zap size={18} />,
      attrs: ['Urgency 40%', 'Weight 25%', 'Effort 20%', 'Difficulty 15%'],
    },
    {
      num: '02',
      title: 'Academic Risk Engine',
      tagline: '"Which subjects are in trouble?"',
      desc: 'Monitors attendance against your statutory threshold (e.g. 75%), recent marks trends, and exam proximity. Calculates the exact number of consecutive classes required to restore good standing.',
      icon: <AlertTriangle size={18} />,
      attrs: ['Attendance Threshold', 'Marks Trajectory', 'Exam Proximity', 'Recovery Math'],
    },
    {
      num: '03',
      title: 'Conflict Detection Engine',
      tagline: '"Am I overloaded this week?"',
      desc: 'Scans forward for critical collisions where multiple major submissions, quizzes, or exams land within the same 48-hour window. Issues warning severity and proactive buffer scheduling.',
      icon: <Layers size={18} />,
      attrs: ['48-Hour Collision Window', 'Severity Scoring', 'Buffer Days'],
    },
    {
      num: '04',
      title: 'Adaptive Study Planner',
      tagline: '"How do I prepare for this exam?"',
      desc: 'Generates day-by-day study schedules from exam date, available hours per day, and topic difficulty. Allocates complex topics early and reserves final days for mock tests and revision buffers.',
      icon: <Calendar size={18} />,
      attrs: ['Day-by-Day Cadence', 'Difficulty Spacing', 'Revision Buffers'],
    },
    {
      num: '05',
      title: 'Recommendation Engine',
      tagline: '"What should I do next?"',
      desc: 'Synthesizes real-time outputs from all 4 engines into ranked, actionable next steps. Every single recommendation specifies the exact data trigger behind it.',
      icon: <Compass size={18} />,
      attrs: ['Cross-Engine Synthesis', 'Actionable Verbs', 'Contextual Explanations'],
    },
  ];

  return (
    <div className="landing-page" id="landing-top">
      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav
        className={`landing-nav ${scrolled ? 'landing-nav-scrolled' : ''}`}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div
          className="landing-nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          role="button"
          tabIndex={0}
          aria-label="CampusFlow AI Home"
        >
          <div className="landing-nav-icon" aria-hidden="true">CF</div>
          <span className="landing-nav-name">CampusFlow AI</span>
        </div>

        <div className="landing-nav-links" aria-label="Section navigation">
          <button className="landing-nav-link" onClick={() => scrollTo('section-hero-preview')}>Preview</button>
          <button className="landing-nav-link" onClick={() => scrollTo('section-intelligence')}>Intelligence</button>
          <button className="landing-nav-link" onClick={() => scrollTo('section-how')}>How It Works</button>
          <button className="landing-nav-link" onClick={() => scrollTo('section-transparency')}>Transparency</button>
        </div>

        <div className="landing-nav-actions">
          {user ? (
            <button className="btn btn-primary btn-sm" onClick={onEnter} id="nav-dashboard">
              Go to Dashboard →
            </button>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={onSignIn} id="nav-signin">
                Sign In
              </button>
              <button className="btn btn-primary btn-sm" onClick={onEnter} id="nav-get-started">
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── BALANCED TWO-COLUMN HERO SECTION ──────────────── */}
      <section className="landing-hero" id="landing-hero" aria-label="Hero Overview">
        <div className="hero-grid">
          {/* LEFT: Headline & Value Proposition */}
          <div className="hero-left">
            <div className="hero-kicker" aria-hidden="true">
              <span className="hero-kicker-line" />
              Academic Intelligence Platform
            </div>

            <h1 className="hero-headline" aria-label="Your Academic Life, Intelligently Organized">
              <span className="hero-headline-lg">Your Academic</span>
              <span className="hero-headline-lg hero-headline-accent">Intelligently</span>
              <span className="hero-headline-lg">Organized.</span>
            </h1>

            <p className="hero-sub">
              CampusFlow AI is an academic operating system that connects your subjects, assignments,
              exams, attendance, and grades — calculating transparent priorities, detecting hidden risks,
              and eliminating deadline collisions.
            </p>

            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={onEnter} id="hero-cta-primary">
                {user ? 'Open Workspace' : 'Get Started'}
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" style={{ marginLeft: 6 }} />
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => scrollTo('section-intelligence')}
                id="hero-cta-secondary"
              >
                Explore Engines
              </button>
            </div>

            <div className="hero-stats" aria-label="Key Platform Metrics">
              {[
                { num: '5', label: 'Intelligence Engines' },
                { num: '100%', label: 'Explainable Math' },
                { num: '48h', label: 'Conflict Window' },
                { num: 'Real', label: 'MongoDB Backed' },
              ].map(({ num, label }) => (
                <div key={label} className="hero-stat-cell">
                  <div className="hero-stat-num">{num}</div>
                  <div className="hero-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Live High-Fidelity Product Preview Card */}
          <div className="hero-right" id="section-hero-preview">
            <div className="hero-preview-window">
              <div className="hero-preview-topbar">
                <div className="preview-dots">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </div>
                <div className="preview-topbar-title">
                  CAMPUSFLOW OS · HARSH MANGLA · SEM 5 CSE
                </div>
                <div className="preview-health-pill">
                  <span className="pulse-dot" /> 88% HEALTH
                </div>
              </div>

              <div className="hero-preview-body">
                {/* Metric Strip */}
                <div className="hero-metric-strip">
                  <div className="hero-metric-box">
                    <span className="hero-metric-label">Enrolled</span>
                    <span className="hero-metric-val">5 Subjects</span>
                  </div>
                  <div className="hero-metric-box">
                    <span className="hero-metric-label">Pending</span>
                    <span className="hero-metric-val" style={{ color: 'var(--warning)' }}>7 Tasks</span>
                  </div>
                  <div className="hero-metric-box">
                    <span className="hero-metric-label">Attendance</span>
                    <span className="hero-metric-val" style={{ color: 'var(--success)' }}>81.6% Avg</span>
                  </div>
                  <div className="hero-metric-box">
                    <span className="hero-metric-label">At Risk</span>
                    <span className="hero-metric-val" style={{ color: 'var(--danger)' }}>1 Subject</span>
                  </div>
                </div>

                {/* Priority Card Preview */}
                <div className="hero-preview-card priority-card">
                  <div className="preview-card-header">
                    <div className="preview-card-tag" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                      PRIORITY ENGINE · SCORE 87 (CRITICAL)
                    </div>
                    <span className="preview-card-meta">Due in 2 days</span>
                  </div>
                  <div className="preview-card-title">DBMS Assignment — ER Diagram & 3NF Normalization</div>
                  <p className="preview-card-rationale">
                    "Ranked #1 because deadline is in 48h, estimated effort is 5 hours, and it carries high academic grading weight."
                  </p>
                </div>

                {/* Academic Risk Alert Card Preview */}
                <div className="hero-preview-card risk-card">
                  <div className="preview-card-header">
                    <div className="preview-card-tag" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
                      RISK DETECTED · ATTENDANCE THRESHOLD
                    </div>
                    <span className="preview-card-meta" style={{ color: 'var(--danger)' }}>71.7% / 75.0%</span>
                  </div>
                  <div className="preview-card-title">Analysis of Circuits (EC2003)</div>
                  <div className="preview-progress-track">
                    <div className="preview-progress-fill" style={{ width: '71.7%', background: 'var(--danger)' }} />
                  </div>
                  <div className="preview-card-recovery">
                    Recovery Action: Must attend next <strong>2 consecutive lectures</strong> to exceed 75% threshold.
                  </div>
                </div>

                {/* Conflict Engine & Study Planner Snippet */}
                <div className="hero-preview-dual">
                  <div className="hero-dual-box">
                    <div className="dual-box-header">
                      <Calendar size={13} style={{ color: 'var(--accent)' }} />
                      <span>STUDY PLANNER</span>
                    </div>
                    <div className="dual-box-content">
                      Day 3/14: Relational Algebra & SQL Joins (2h target)
                    </div>
                  </div>

                  <div className="hero-dual-box">
                    <div className="dual-box-header">
                      <Compass size={13} style={{ color: 'var(--info)' }} />
                      <span>RECOMMENDED ACTION</span>
                    </div>
                    <div className="dual-box-content">
                      Start DBMS normalization now to prevent Friday exam collision.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollTo('section-problem')}
          className="hero-scroll-indicator"
          aria-label="Scroll to Problem Section"
        >
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
          <span>Scroll to explore</span>
        </button>
      </section>

      {/* ── 02 THE PROBLEM ─────────────────────────────────── */}
      <section className="landing-section landing-section-dark" id="section-problem" aria-labelledby="problem-heading">
        <div className="section-container">
          <div className="section-number">02 — The Academic Problem</div>
          <h2 id="problem-heading" className="section-title">
            Generic to-do apps<br />
            <span className="accent">fail university students.</span>
          </h2>
          <p className="section-desc">
            To-do apps show you a flat checklist. Calendars show you a time grid. Neither evaluates
            syllabus weights, marks decline trends, attendance penalties, or multi-exam bottlenecks.
          </p>

          <div className="problem-grid" role="list">
            {[
              {
                num: '01',
                title: 'Scattered Obligations',
                desc: 'Deadlines reside across university LMS portals, WhatsApp group chats, course syllabi, and physical notebooks — never unified.',
              },
              {
                num: '02',
                title: 'Zero Priority Intelligence',
                desc: 'Students know they have 10 tasks, but not which one carries 30% of their final grade or which one takes 6 hours to execute.',
              },
              {
                num: '03',
                title: 'Silent Attendance Traps',
                desc: 'Attendance quietly decays week after week until students are debarred from the final examination without advance warning.',
              },
              {
                num: '04',
                title: '48h Deadline Collisions',
                desc: 'Multiple major assignments and internal exams land in the same 48-hour window without proactive buffer scheduling.',
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="problem-card" role="listitem">
                <div className="problem-card-num">{num}</div>
                <h3 className="problem-card-title">{title}</h3>
                <p className="problem-card-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 03 FIVE INTELLIGENCE ENGINES ───────────────────── */}
      <section className="landing-section" id="section-intelligence" aria-labelledby="intelligence-heading">
        <div className="section-container">
          <div className="section-number">03 — Academic Intelligence</div>
          <h2 id="intelligence-heading" className="section-title">
            Five rule-based engines.<br />
            <span className="accent">Zero black boxes.</span>
          </h2>
          <p className="section-desc">
            CampusFlow AI uses deterministic, verifiable mathematical formulas. Every priority score,
            risk assessment, and study session is explainable in plain English.
          </p>

          <div className="engines-list">
            {ENGINES.map(({ num, title, tagline, desc, attrs, icon }) => (
              <div key={num} className="engine-card" role="article">
                <div className="engine-card-left">
                  <div className="engine-card-num">{num}</div>
                  <div className="engine-card-icon">{icon}</div>
                </div>
                <div className="engine-card-body">
                  <div className="engine-card-header">
                    <h3 className="engine-card-title">{title}</h3>
                    <span className="engine-card-tagline">{tagline}</span>
                  </div>
                  <p className="engine-card-desc">{desc}</p>
                  <div className="engine-card-attrs" role="list">
                    {attrs.map((attr) => (
                      <span key={attr} className="engine-attr-pill" role="listitem">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 04 HOW IT WORKS ────────────────────────────────── */}
      <section className="landing-section landing-section-dark" id="section-how" aria-labelledby="how-heading">
        <div className="section-container">
          <div className="section-number">04 — Workflow Architecture</div>
          <h2 id="how-heading" className="section-title">
            Set up in 60 seconds.<br />
            <span className="accent">Instant intelligence.</span>
          </h2>
          <p className="section-desc">
            From enrollment to actionable daily intelligence in four simple, automated steps.
          </p>

          <div className="how-steps-grid">
            {[
              {
                step: '01',
                title: 'Enroll Subjects',
                desc: 'Add course names, credits, instructors, and mandatory attendance thresholds (e.g. 75%). Takes less than a minute.',
              },
              {
                step: '02',
                title: 'Log Tasks & Exams',
                desc: 'Add assignments with estimated hours and academic weight. Enter exam syllabus topics and dates.',
              },
              {
                step: '03',
                title: 'Track Attendance',
                desc: 'Tap Present or Absent after lectures. Real-time percentages update automatically with margin-for-error calculations.',
              },
              {
                step: '04',
                title: 'Act on Insights',
                desc: 'Engines compute priority queues, identify attendance risks, warn of collisions, and build daily study cadences.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="how-step-card">
                <div className="how-step-badge">{step}</div>
                <h3 className="how-step-title">{title}</h3>
                <p className="how-step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 05 BALANCED TRANSPARENCY & EXPLAINABILITY ─────── */}
      <section className="landing-section" id="section-transparency" aria-labelledby="transparency-heading">
        <div className="section-container">
          <div className="section-number">05 — Total Explainability</div>
          <h2 id="transparency-heading" className="section-title">
            Every output explained.<br />
            <span className="accent">Side-by-side validation.</span>
          </h2>
          <p className="section-desc">
            No hallucinations. No arbitrary numbers. Compare how the Priority and Risk engines
            turn raw course metrics into clear student decisions.
          </p>

          {/* Side-by-side balanced cards (fixes empty space bug) */}
          <div className="transparency-dual-grid">
            {/* CARD 1: Priority Decision */}
            <div className="transparency-card priority-side">
              <div className="transparency-card-label">
                <Zap size={14} style={{ color: 'var(--danger)' }} />
                <span>Priority Engine Decision</span>
              </div>
              <div className="transparency-card-main">
                <div>
                  <h3 className="transparency-task-name">DBMS End-Sem Assignment</h3>
                  <div className="transparency-task-meta">
                    CS3001 · 5h Estimated Effort · Critical Weight
                  </div>
                </div>
                <div className="transparency-score-badge" style={{ color: 'var(--danger)' }}>
                  87
                  <span className="badge badge-high">HIGH</span>
                </div>
              </div>

              <div className="transparency-formula-breakdown">
                <div className="formula-row">
                  <span>Urgency (Due in 48h)</span>
                  <strong>40 / 40</strong>
                </div>
                <div className="formula-row">
                  <span>Effort (~5 Hours)</span>
                  <strong>16 / 20</strong>
                </div>
                <div className="formula-row">
                  <span>Academic Weight (High)</span>
                  <strong>20 / 25</strong>
                </div>
                <div className="formula-row">
                  <span>Difficulty (Hard)</span>
                  <strong>11 / 15</strong>
                </div>
              </div>

              <div className="transparency-quote">
                "Ranked high priority because the deadline lands in 2 days, requires significant effort (5h), and directly impacts your semester grade."
              </div>
            </div>

            {/* CARD 2: Risk Insight */}
            <div className="transparency-card risk-side">
              <div className="transparency-card-label">
                <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />
                <span>Academic Risk Insight</span>
              </div>
              <div className="transparency-card-main">
                <div>
                  <h3 className="transparency-task-name">Analysis of Circuits</h3>
                  <div className="transparency-task-meta">
                    EC2003 · Dr. Sunita Nair · 3 Credits
                  </div>
                </div>
                <div className="transparency-score-badge" style={{ color: 'var(--danger)' }}>
                  71.7%
                  <span className="badge badge-high">AT RISK</span>
                </div>
              </div>

              <div className="transparency-formula-breakdown">
                <div className="formula-row">
                  <span>Attended Classes</span>
                  <strong>33 / 46</strong>
                </div>
                <div className="formula-row">
                  <span>Statutory Threshold</span>
                  <strong>75.0%</strong>
                </div>
                <div className="formula-row">
                  <span>Deficit Classes</span>
                  <strong style={{ color: 'var(--danger)' }}>-1.5 Classes</strong>
                </div>
                <div className="formula-row">
                  <span>Exam Proximity</span>
                  <strong>5 Days Away</strong>
                </div>
              </div>

              <div className="transparency-quote">
                "Risk triggered because attendance (71.7%) is below the 75% cutoff and an internal exam is approaching in 5 days. Must attend next 2 sessions."
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 06 FULL PRODUCT PREVIEW ───────────────────────── */}
      <section className="landing-section landing-section-dark" id="section-preview" aria-labelledby="preview-heading">
        <div className="section-container">
          <div className="section-number">06 — Connected Workspace</div>
          <h2 id="preview-heading" className="section-title">
            Nine unified modules.<br />
            <span className="accent">One coherent dashboard.</span>
          </h2>
          <p className="section-desc">
            All data flows seamlessly between attendance tracking, subject markbooks, assignments,
            and exams.
          </p>

          <div className="module-pill-row" role="list" aria-label="Available Modules">
            {[
              'Dashboard', 'Subjects', 'Tasks', 'Examinations', 'Attendance',
              'Study Planner', 'Analytics', 'Recommendations', 'Student Profile',
            ].map((m) => (
              <span key={m} className="module-pill" role="listitem">
                {m}
              </span>
            ))}
          </div>

          <div className="full-preview-box">
            <div className="preview-bar" aria-hidden="true">
              <div className="preview-dot preview-dot-red" />
              <div className="preview-dot preview-dot-yellow" />
              <div className="preview-dot preview-dot-green" />
              <div className="preview-bar-title">
                CampusFlow AI — Executive Intelligence Dashboard
              </div>
            </div>

            <div className="preview-layout">
              <div className="preview-mini-sidebar" aria-hidden="true">
                <div className="mini-brand">
                  <div className="mini-logo">CF</div>
                  <span>CampusFlow</span>
                </div>
                {['Dashboard', 'Subjects', 'Tasks', 'Exams', 'Attendance', 'Planner', 'Analytics'].map((name, i) => (
                  <div key={name} className={`mini-nav-item ${i === 0 ? 'active' : ''}`}>
                    <div className="mini-nav-square" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>

              <div className="preview-mini-content" aria-hidden="true">
                <div className="mini-dash-head">
                  <h3>Good afternoon, Harsh</h3>
                  <span className="badge badge-high" style={{ background: 'var(--accent)', color: '#080808', fontWeight: 800 }}>
                    SEMESTER 5 · CSE
                  </span>
                </div>

                <div className="mini-stats-grid">
                  <div className="mini-stat">
                    <span className="mini-stat-num">5</span>
                    <span className="mini-stat-lbl">Subjects</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-num" style={{ color: 'var(--warning)' }}>7</span>
                    <span className="mini-stat-lbl">Pending</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-num" style={{ color: 'var(--accent)' }}>3</span>
                    <span className="mini-stat-lbl">Exams</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-num" style={{ color: 'var(--danger)' }}>1</span>
                    <span className="mini-stat-lbl">At Risk</span>
                  </div>
                </div>

                <div className="mini-card-row">
                  <div className="mini-panel">
                    <div className="mini-panel-title">TOP PRIORITY TASK</div>
                    <div className="mini-task-item">
                      <span>DBMS Assignment (ER & Normalization)</span>
                      <strong style={{ color: 'var(--danger)' }}>87 · HIGH</strong>
                    </div>
                    <div className="mini-task-item">
                      <span>DSA Lab Graph Algorithms Implementation</span>
                      <strong style={{ color: 'var(--warning)' }}>64 · MED</strong>
                    </div>
                  </div>

                  <div className="mini-panel">
                    <div className="mini-panel-title">ATTENDANCE COMPLIANCE</div>
                    <div className="mini-risk-item">
                      <span>AOC Circuits: 71.7% (&lt; 75% cutoff)</span>
                      <strong style={{ color: 'var(--danger)' }}>CRITICAL</strong>
                    </div>
                    <div className="mini-risk-item">
                      <span>DBMS: 83.3% (Safe · +4 margin)</span>
                      <strong style={{ color: 'var(--success)' }}>GOOD</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 07 FINAL CALL TO ACTION ───────────────────────── */}
      <section className="cta-section" id="section-cta" aria-labelledby="cta-heading">
        <div className="section-container">
          <div className="cta-overline">— Ready to Take Control</div>
          <h2 id="cta-heading" className="cta-section-title">
            Your academic life,<br />
            intelligently organized.
          </h2>
          <p className="cta-section-sub">
            Built specifically for engineering and university students who want clarity,
            high academic standing, and zero last-minute panic.
          </p>

          <div className="cta-actions">
            <button className="btn btn-lg btn-cta-main" onClick={onEnter} id="cta-get-started">
              {user ? 'Open Dashboard →' : 'Get Started →'}
            </button>
            {!user && (
              <button className="btn btn-lg btn-cta-sub" onClick={onSignIn} id="cta-signin">
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-footer-inner section-container">
          <div className="landing-footer-brand-col">
            <div className="landing-footer-brand">
              <div className="landing-nav-icon" aria-hidden="true">CF</div>
              <div>
                <div className="footer-brand-name">CampusFlow AI</div>
                <div className="footer-brand-sub">Academic Intelligence Platform</div>
              </div>
            </div>
            <p className="landing-footer-copy">
              © 2026 CampusFlow AI. MERN Architecture · MongoDB · Express · React · Node.js · Explainable Rule Engines.
            </p>
          </div>

          <div className="landing-footer-links-grid">
            <div>
              <div className="footer-col-title">Intelligence</div>
              <ul className="footer-col-list">
                <li>Priority Engine</li>
                <li>Academic Risk Detection</li>
                <li>Conflict Detector</li>
                <li>Adaptive Study Planner</li>
                <li>Action Recommendations</li>
              </ul>
            </div>

            <div>
              <div className="footer-col-title">Modules</div>
              <ul className="footer-col-list">
                <li>Dashboard & Metrics</li>
                <li>Subject Markbook</li>
                <li>Tasks & Assignments</li>
                <li>Examination Timetable</li>
                <li>Attendance Tracker</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
