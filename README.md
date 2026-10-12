# CampusFlow AI
### Your Academic Life, Intelligently Organized.

CampusFlow AI is an academic intelligence platform engineered to assist university students in synthesizing their academic responsibilities, evaluating their workload, identifying emerging academic risks, and making structured study decisions.

---

## 1. Project Overview & Problem Statement

### The Problem
University students routinely manage multiple competing academic demands across disconnected channels:
- **Coursework & Assignments**: Logged in separate portals or personal notes with different deadlines, estimated efforts, and grading weights.
- **Attendance Policies**: Institutional thresholds (such as the mandatory 75% attendance rule) require continuous manual calculation of safe absences versus required recovery classes.
- **Approaching Examinations**: Module tests and semester finals often cluster together, creating unannounced preparation bottlenecks.
- **Performance Trajectories**: Assessment marks are frequently evaluated in isolation rather than as an indicator of course health.

Conventional task management applications treat all items as static, unweighted to-do entries:
> *"DBMS Assignment — Due Friday"*

### The CampusFlow AI Solution
CampusFlow AI unifies these academic signals into an integrated student workspace powered by **explainable rule-based intelligence engines**. Instead of merely displaying dates, the platform contextualizes tasks, deadlines, and grades:
> **DBMS Assignment — HIGH PRIORITY (Score: 87/100)**  
> *Due in 2 days · Estimated Effort: ~5 hours · Academic Weight: High*  
> *"Classified as High Priority because the deadline is in 2 days, requires substantial effort (~5h), and carries critical academic weight towards your final grade."*

Every recommendation, risk warning, and priority score is accompanied by an audit-ready, plain-English explanation.

---

## 2. Core Implemented Features

Each feature in CampusFlow AI addresses a distinct challenge in the student lifecycle:

### 1. Centralized Student Dashboard
- **What It Does**: Aggregates the student's Academic Health index, urgent tasks queue, active risk alerts, exam countdowns, and quick actions into a unified commanding interface.
- **Problem It Solves**: Eliminates cognitive overload caused by checking separate dashboards for attendance, grades, and assignments.
- **Contribution**: Serves as the primary operational hub, orienting the student toward immediate priorities upon signing in.

### 2. Academic Task Management
- **What It Does**: Supports full lifecycle tracking of assignments, lab practicals, homework, and projects. Automatically invokes the Priority Engine upon task creation or modification.
- **Problem It Solves**: Prevents overlooked deadlines and misjudged effort estimations.
- **Contribution**: Feeds structured data (urgency, estimated hours, difficulty, syllabus weight) directly into the prioritization and conflict engines.

### 3. Subject & Course Management
- **What It Does**: Maintains enrolled courses, instructor information, credits, current attendance counts, internal assessment scores, and syllabus modules.
- **Problem It Solves**: Keeps all course metadata, attendance logs, and performance metrics centralized under a single academic profile.
- **Contribution**: Acts as the foundational data model upon which attendance health and exam schedules operate.

### 4. Attendly — Academic Attendance Module
- **What It Does**: Records attended versus total lecture sessions for each enrolled subject, computes attendance percentages in real time, and classifies status into `SAFE` ($\ge 75\%$), `WARNING` ($70\% - 74\%$), or `CRITICAL` ($< 70\%$).
- **Problem It Solves**: Inadvertent attendance debarment caused by lack of visibility into absence thresholds.
- **Relationship to CampusFlow AI**: *Attendly* represents the academic attendance tracking module within the overarching CampusFlow AI platform. Attendance statistics from Attendly directly feed the Risk Engine.

### 5. Exam & Assessment Tracking
- **What It Does**: Tracks upcoming internal assessments, module examinations, and final practicals with syllabus coverage, difficulty levels, and dates.
- **Problem It Solves**: Reduces exam anxiety caused by unexpected proximity and lack of revision planning.
- **Contribution**: Supplies critical date benchmarks for the Study Planner and the Conflict Engine.

### 6. Intelligent Priority Engine
- **What It Does**: Dynamically scores every pending task from 0 to 100 using a multi-factor weighted formula, labeling items as `HIGH`, `MEDIUM`, or `LOW` priority with transparent explanations.
- **Problem It Solves**: Resolves prioritization paralysis when multiple assignments are due concurrently.
- **Contribution**: Ensures students allocate their limited study hours to high-impact obligations first.

### 7. Academic Risk Detection Engine
- **What It Does**: Evaluates attendance margins, declining mark trends across internal tests, and exam proximity to generate proactive risk alerts.
- **Problem It Solves**: Prevents students from discovering academic deficits only after failing an internal assessment or being debarred from exams.
- **Contribution**: Identifies struggling subjects before the end of the term, calculating the exact number of classes required to recover attendance.

### 8. Assessment Conflict Engine
- **What It Does**: Scans deadlines and exam dates within rolling 48-hour windows, identifying heavy academic clusters and proposing re-sequencing advice.
- **Problem It Solves**: Sudden deadline pileups that lead to rushed submissions and burnout.
- **Contribution**: Provides proactive pacing alerts rather than retroactive notifications.

### 9. Intelligent Study Planner
- **What It Does**: Generates day-by-day revision schedules for upcoming exams by calculating available days, reserving dedicated revision buffers, and distributing syllabus topics with difficulty weighting.
- **Problem It Solves**: Unstructured cramming before examinations.
- **Contribution**: Translates raw syllabus topics into realistic, daily actionable study blocks.

### 10. Academic Performance Analytics
- **What It Does**: Visualizes grade trends, subject-wise attendance distributions, completed workload velocity, and overall academic health scores.
- **Problem It Solves**: Lack of macro-level feedback on academic consistency and trajectory.
- **Contribution**: Gives students an objective self-assessment of their semester performance.

### 11. Context-Aware Recommendations
- **What It Does**: Synthesizes risk alerts, top-ranked priority tasks, and upcoming exam schedules to produce three high-impact, immediate action steps.
- **Problem It Solves**: Clutter and indecision regarding the single best next step to take.
- **Contribution**: Guides the student's daily workflow with clear, unambiguous direction.

### 12. Two-Step Email OTP Authentication
- **What It Does**: Restricts access to verified university email domains (`@chitkara.edu.in`), hashes passwords using bcrypt, and requires single-use, 6-digit cryptographic Email OTP verification before issuing sessions.
- **Problem It Solves**: Unauthorized access and reliance on unverified student accounts.
- **Contribution**: Establishes enterprise-grade security with temporary challenge tokens, SHA-256 database storage, 5-minute expirations, and resend cooldowns.

---

## 3. The Explainable Intelligence Layer

A foundational principle of CampusFlow AI is **explainability**: the platform deliberately utilizes transparent, auditable rule-based intelligence rather than opaque black-box models. Students and academic advisors can inspect the exact reasoning behind every score and recommendation.

### 1. Task Prioritization Algorithm
Every task is assigned an absolute composite score calculated across four core academic dimensions:

$$\text{Priority Score} = (\text{Urgency} \times 0.40) + (\text{Academic Weight} \times 0.25) + (\text{Effort} \times 0.20) + (\text{Difficulty} \times 0.15)$$

- **Urgency (40%)**: Derived from the remaining hours until the deadline. Exponentially ramps up as the deadline approaches zero.
- **Academic Weight (25%)**: Evaluates whether the submission is a major semester project (100), an internal assignment (75), or a minor homework task (40).
- **Effort (20%)**: Normalized from estimated completion hours ($1\text{h} - 10\text{h}+$); higher effort tasks requiring deep work receive higher scheduling weight.
- **Difficulty (15%)**: Reflects syllabus complexity and subject difficulty (1–5 scale).

Tasks scoring $\ge 70$ are labeled **HIGH**, $40 - 69$ **MEDIUM**, and $< 40$ **LOW**. The system then constructs a human-readable justification summarizing the dominant factors.

### 2. Multi-Factor Academic Risk Assessment
The Risk Engine flags subjects meeting any of three conditions:
1. **Attendance Risk**: If attendance is $< 75\%$, the engine calculates:
   $$\text{Classes Needed} = \left\lceil \frac{0.75 \times \text{Total} - \text{Attended}}{0.25} \right\rceil$$
2. **Negative Performance Trajectory**: If the last two assessment scores exhibit a downward slope ($M_n < M_{n-1}$), a performance trajectory alert is raised.
3. **High-Difficulty Exam Proximity**: If a subject with difficulty $\ge 4$ has an exam scheduled within 7 days, an exam readiness warning is flagged.

### 3. Workload Conflict Scanning
The Conflict Engine evaluates deadlines across rolling 48-hour windows:
- If 2 or more major deliverables or examinations collide within 48 hours, a `CONFLICT` warning is generated.
- The engine calculates the total estimated hours required across colliding items and compares it against a realistic daily study budget (6 hours/day), advising which task must be commenced early to avoid crunch.

### 4. Intelligent Schedule Allocation
When scheduling an exam study plan:
- The system reserves the final **2 to 3 days** solely for practice tests, formula revision, and rest.
- The remaining days are divided proportionally across topics, weighting difficult chapters with larger study blocks.

---

## 4. Technology Stack

| Layer | Technology | Role & Justification |
|---|---|---|
| **Frontend Framework** | **React 18** | Modular component architecture, efficient virtual DOM updates, custom hook abstractions. |
| **Build Tooling** | **Vite 5** | Instant hot module replacement (HMR), optimized production bundling, fast cold starts. |
| **Styling** | **Vanilla CSS (Custom Properties)** | Tailored dark-mode design system with neon-yellow branding (`#E8FF00`), responsive layout grids, and accessible form states without framework overhead. |
| **Backend Runtime** | **Node.js** | Non-blocking, asynchronous event loop ideal for handling concurrent I/O operations and API requests. |
| **Web Framework** | **Express.js (v5)** | Clean routing architecture, standardized middleware pipelines, RESTful JSON endpoint conventions. |
| **Database** | **MongoDB** | Document-oriented NoSQL persistence allowing flexible schema modeling for nested academic entities. |
| **ODM Layer** | **Mongoose (v8+)** | Strict schema validation, compound indices, automated TTL expiration indexes for OTP security. |
| **Authentication** | **JWT & bcryptjs** | Stateless JSON Web Tokens, salted password hashing (12 rounds), protected route guards. |
| **Email Delivery** | **Nodemailer** | SMTP integration for dispatching real, transactional 6-digit OTP verification codes. |

---

## 5. System Architecture

The following diagram illustrates the interaction between student clients, the API gateway, the intelligence processing layer, and the persistence tier:

```
[ Student Browser ]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  CampusFlow AI Frontend (React 18 / Vite SPA)               │
│  - SPA URL Synchronization & Protected Route Guards         │
│  - Black & Neon Theme Design System                         │
│  - Centralized API Fetch Client (client/src/services/api.js)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON Requests
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend REST API (Node.js / Express — Port 8000)           │
│  - Route Handlers & Input Sanitization                      │
│  - JWT & Challenge Token Verification Middleware            │
│  - Centralized Error Handling & Rate Limiting               │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ Intelligence Services Layer  │ │ Email & Security Services  │
│ - priorityEngine.js          │ │ - otpService.js (SHA-256)  │
│ - riskEngine.js              │ │ - emailService.js (SMTP)   │
│ - conflictEngine.js          │ │ - validationService.js     │
│ - studyPlanner.js            │ └──────────────┬─────────────┘
│ - analyticsEngine.js         │                │
└──────────────┬───────────────┘                │ SMTP Protocol
               │                                ▼
               │                     [ Student Email Inbox ]
               │                     (6-Digit Verification Code)
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Persistence Tier (MongoDB / Mongoose ODM)                  │
│  - Users & Profiles                                         │
│  - OtpVerifications (Auto-Expiring TTL Index)               │
│  - Subjects, AttendanceSessions, Tasks, Exams, StudyPlans   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Attendly Module Integration

- **Role**: *Attendly* is the dedicated academic attendance logging and policy enforcement module within CampusFlow AI.
- **Current Capability**: Students record attended and missed sessions per subject. The module dynamically computes cumulative attendance percentages and classifies subjects into Safe, Warning, and Critical tiers based on the 75% institutional threshold.
- **Integration Boundary**: The attendance calculations produced by Attendly directly drive the Academic Risk Engine on the main dashboard.
- **External University Portals**: Formal third-party university ERP scrapers or Code Brigade integrations are intentionally omitted from production code to prevent credential compromise, as official public OAuth APIs are not currently exposed. Attendly operates as an independent, secure data module designed to link with official university APIs when authorized endpoints become available.

---

## 7. Application Preview

> *Visual documentation of the CampusFlow AI workspace interface.*

```
+----------------------------------------------------------------------------------------------------+
|  CF  CAMPUSFLOW AI                 [ Academic Health: 88% Optimal ]             Harsh Mangla [5th] |
+----------------------------------------------------------------------------------------------------+
|  NAVIGATION       |  DASHBOARD INTELLIGENCE OVERVIEW                                               |
|                   |                                                                                |
|  [>] Dashboard    |  [!] ACADEMIC RISK ALERTS (1 Subject at Risk)                                  |
|  [ ] Subjects     |      - AOC: Attendance is 72.0% (Below 75%). Attend next 2 classes to recover. |
|  [ ] Tasks        |                                                                                |
|  [ ] Exams        |  [*] TOP PRIORITY QUEUE (Explainable Scoring)                                  |
|  [ ] Attendance   |      1. DBMS Assignment       [SCORE 87 · HIGH]    Due in 2 days  (Effort: ~5h)    |
|  [ ] Planner      |      2. DSA Module Test 3     [SCORE 78 · HIGH]    Approaching in 5 days           |
|  [ ] Analytics    |      3. Web Tech Lab Report   [SCORE 52 · MEDIUM]  Due in 6 days                   |
|  [ ] Profile      |                                                                                |
|                   |  [~] RECOMMENDED NEXT ACTIONS                                                  |
|                   |      -> Focus 2 hours on DBMS Assignment to mitigate upcoming deadline crunch. |
|                   |      -> Attend upcoming AOC lecture tomorrow to initiate attendance recovery.  |
+----------------------------------------------------------------------------------------------------+
```

*(Screenshots of the live web interface, responsive mobile view, and OTP verification card can be placed in this section for portfolio and presentation displays.)*

---

## 8. Current Implementation Status & Roadmap

### Current Implementation (Working in Codebase)
- [x] Complete REST API with structured JSON responses and centralized error handling.
- [x] Full-stack JWT authentication with university domain validation (`@chitkara.edu.in`).
- [x] Cryptographic 2-step Email OTP verification (6-digit numeric, SHA-256 database hashing, 5-minute expiration, 60s cooldown, replay protection).
- [x] Core academic data models (Users, Subjects, Tasks, Exams, Study Plans, Attendance).
- [x] Priority Engine with multi-factor scoring and natural language explanations.
- [x] Academic Risk Detection Engine with attendance recovery calculation.
- [x] Conflict Engine detecting deadline clusters in 48-hour windows.
- [x] Automated day-by-day Study Planner with dedicated revision buffer reservation.
- [x] Performance Analytics computing velocity, score trends, and health ratings.
- [x] SPA frontend with URL synchronization, responsive dark/neon styling, and zero external layout dependencies.
- [x] Automated end-to-end integration and security test suites (34 tests passing).

### Roadmap (Future Enhancements)
- [ ] **Authorized University ERP Integration**: Ingest attendance and marks automatically once institutional OAuth/API interfaces are released.
- [ ] **Machine Learning Predictive Modeling**: Train regression models on historical student performance to predict exam outcomes based on study hours and attendance.
- [ ] **Real-Time Notification Delivery**: WebPush or SMS notifications for immediate deadline proximity and conflict alerts.
- [ ] **Mobile Companion Application**: React Native cross-platform mobile client for on-the-go attendance logging.
- [ ] **Collaborative Study Groups**: Peer-to-peer task sharing and syllabus progress tracking for group projects.

---

## 9. Local Setup & Installation

Follow these steps to run CampusFlow AI locally on your machine:

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: A running local MongoDB instance (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### 2. Clone the Repository
```bash
git clone https://github.com/Harsh-Mangla-2927/CampusFlow-AI.git
cd CampusFlow-AI
```

### 3. Configure Environment Variables

**Backend (`server/.env`):**
```bash
cp server/.env.example server/.env
```
Ensure your `server/.env` contains your preferred configuration:
```ini
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/campusflow
JWT_SECRET=your_long_random_jwt_secret_min_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ALLOWED_EMAIL_DOMAINS=chitkara.edu.in,chitkara.ac.in,campusflow.ai

# SMTP Email Verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_google_app_password
EMAIL_FROM=CampusFlow AI <your_email@gmail.com>

# OTP Parameters
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
```

**Frontend (`client/.env`):**
```bash
cp client/.env.example client/.env
```

### 4. Install Dependencies
```bash
# Install backend packages
cd server
npm install

# Install frontend packages
cd ../client
npm install
cd ..
```

### 5. Seed Demo Evaluator Data (Recommended)
To populate the database with realistic subjects, attendance records, tasks, and exams:
```bash
cd server
npm run seed
```
*Seeded Demo Account:*  
- **Email**: `harsh@chitkara.edu.in`  
- **Password**: `demo1234`

### 6. Start the Application

**Terminal 1 — Backend API:**
```bash
cd server
npm run dev
```
*(Starts on `http://localhost:8000`)*

**Terminal 2 — Frontend UI:**
```bash
cd client
npm run dev
```
*(Starts on `http://localhost:5173`)*

Open your browser to `http://localhost:5173` to explore the application.

---

## 10. Automated Testing & Verification

The codebase includes automated test suites to ensure operational integrity:

```bash
# 1. Run the End-to-End API Integration Suite (19 tests)
cd server
node test_e2e_suite.js

# 2. Run the OTP Security & Cryptography Suite (15 tests)
node test_otp_auth_flow.js

# 3. Verify Client Production Build
cd ../client
npm run build
```

To reset registered test users back to the clean demo account at any time:
```bash
cd server
npm run clean:users
```

---

## 11. Academic Context & Authorship

- **Project Title**: CampusFlow AI
- **Developer**: Harsh Mangla
- **Institution**: Chitkara University
- **License**: ISC License

CampusFlow AI is developed as an academic software engineering project demonstrating full-stack architecture, transparent rule-based intelligence systems, and secure student authentication.
