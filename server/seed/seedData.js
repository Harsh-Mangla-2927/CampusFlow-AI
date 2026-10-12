/**
 * Seed Script — CampusFlow AI
 *
 * Creates a realistic demo account with data that exercises all intelligence engines:
 * - AOC with attendance at 72% (below 75% threshold) → risk detected
 * - Recent marks declining in DSA and AOC → trend detected
 * - DBMS assignment due in 2 days with high effort → HIGH priority
 * - Multiple deadlines in 48h → conflict detected
 *
 * Run with: node seed/seedData.js
 */

const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Subject = require('../models/Subject');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const StudyPlan = require('../models/StudyPlan');

const connectDB = require('../config/db');

const DEMO_EMAIL = 'harsh@campusflow.ai';
const CHITKARA_EMAIL = 'harsh@chitkara.edu.in';
const DEMO_PASSWORD = 'demo1234';

const now = new Date();
const daysFromNow = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

const run = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB for seeding');

    // Clean existing demo data
    const existingUsers = await User.find({ email: { $in: [DEMO_EMAIL, CHITKARA_EMAIL] } });
    for (const u of existingUsers) {
      await Subject.deleteMany({ user: u._id });
      await Task.deleteMany({ user: u._id });
      await Exam.deleteMany({ user: u._id });
      await StudyPlan.deleteMany({ user: u._id });
      await User.deleteOne({ _id: u._id });
    }
    console.log('🧹 Cleaned existing demo data');

    // Create primary demo user
    const user = await User.create({
      name: 'Harsh Mangla',
      email: CHITKARA_EMAIL,
      password: DEMO_PASSWORD,
      university: 'Chitkara University',
      course: 'B.Tech Computer Science',
      semester: 5,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    console.log('👤 Primary demo user created:', CHITKARA_EMAIL);

    // Also create harsh@campusflow.ai alias account
    await User.create({
      name: 'Harsh Mangla',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      university: 'Chitkara University',
      course: 'B.Tech Computer Science',
      semester: 5,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    console.log('👤 Alias demo user created:', DEMO_EMAIL);

    // --- Create Subjects ---
    const dbms = await Subject.create({
      user: user._id,
      name: 'Database Management Systems',
      code: 'CS3001',
      teacher: 'Dr. Priya Sharma',
      credits: 4,
      totalClasses: 48,
      attendedClasses: 40,
      attendanceThreshold: 75,
      currentMarks: 72,
      targetMarks: 80,
      color: '#6366f1',
      marksHistory: [
        { score: 78, assessmentName: 'Quiz 1', date: daysFromNow(-60) },
        { score: 75, assessmentName: 'Mid-Term', date: daysFromNow(-30) },
        { score: 72, assessmentName: 'Quiz 2', date: daysFromNow(-10) },
      ],
    });

    const dsa = await Subject.create({
      user: user._id,
      name: 'Data Structures and Algorithms',
      code: 'CS2002',
      teacher: 'Prof. Ramesh Kumar',
      credits: 4,
      totalClasses: 50,
      attendedClasses: 42,
      attendanceThreshold: 75,
      currentMarks: 65,
      targetMarks: 75,
      color: '#f59e0b',
      marksHistory: [
        { score: 80, assessmentName: 'Quiz 1', date: daysFromNow(-70) },
        { score: 72, assessmentName: 'Mid-Term', date: daysFromNow(-35) },
        { score: 65, assessmentName: 'Quiz 2', date: daysFromNow(-7) },
      ],
    });

    const aoc = await Subject.create({
      user: user._id,
      name: 'Analysis of Circuits',
      code: 'EC2003',
      teacher: 'Dr. Sunita Nair',
      credits: 3,
      totalClasses: 46,
      attendedClasses: 33,  // 71.7% — BELOW 75% threshold → CRITICAL
      attendanceThreshold: 75,
      currentMarks: 54,
      targetMarks: 70,
      color: '#ef4444',
      marksHistory: [
        { score: 61, assessmentName: 'Quiz 1', date: daysFromNow(-50) },
        { score: 57, assessmentName: 'Mid-Term', date: daysFromNow(-25) },
        { score: 54, assessmentName: 'Quiz 2', date: daysFromNow(-5) },
      ],
    });

    const webdev = await Subject.create({
      user: user._id,
      name: 'Web Technologies',
      code: 'CS3004',
      teacher: 'Prof. Ankit Mehta',
      credits: 3,
      totalClasses: 44,
      attendedClasses: 38,
      attendanceThreshold: 75,
      currentMarks: 82,
      targetMarks: 85,
      color: '#10b981',
      marksHistory: [
        { score: 78, assessmentName: 'Quiz 1', date: daysFromNow(-45) },
        { score: 82, assessmentName: 'Mid-Term', date: daysFromNow(-20) },
      ],
    });

    const ai = await Subject.create({
      user: user._id,
      name: 'Artificial Intelligence',
      code: 'CS3005',
      teacher: 'Dr. Kavitha Reddy',
      credits: 4,
      totalClasses: 40,
      attendedClasses: 35,
      attendanceThreshold: 75,
      currentMarks: 68,
      targetMarks: 75,
      color: '#8b5cf6',
      marksHistory: [
        { score: 65, assessmentName: 'Quiz 1', date: daysFromNow(-40) },
        { score: 68, assessmentName: 'Mid-Term', date: daysFromNow(-15) },
      ],
    });

    console.log('📚 Subjects created');

    // --- Create Tasks (designed to trigger intelligence engines) ---
    const { calculateTaskPriority } = require('../services/priorityEngine');

    const tasksData = [
      {
        title: 'DBMS Assignment — ER Diagram & Normalization',
        subject: dbms._id,
        description: 'Complete ER diagram for hospital management system and normalize to 3NF. Submit on LMS.',
        type: 'Assignment',
        deadline: daysFromNow(2),
        estimatedHours: 5,
        academicWeight: 'High',
        difficulty: 'Hard',
      },
      {
        title: 'DSA Lab — Graph Algorithms Implementation',
        subject: dsa._id,
        description: 'Implement BFS, DFS, Dijkstra in C++. Write test cases.',
        type: 'Lab',
        deadline: daysFromNow(4),
        estimatedHours: 3,
        academicWeight: 'Medium',
        difficulty: 'Medium',
      },
      {
        title: 'AOC Project — Circuit Simulation Report',
        subject: aoc._id,
        description: 'Simulate RC and RL circuits using MATLAB/Simulink. Write analysis report.',
        type: 'Project',
        deadline: daysFromNow(8),
        estimatedHours: 8,
        academicWeight: 'High',
        difficulty: 'Hard',
      },
      {
        title: 'Web Technologies — React Portfolio Project',
        subject: webdev._id,
        description: 'Build a personal portfolio using React. Include projects, skills, and contact form.',
        type: 'Project',
        deadline: daysFromNow(14),
        estimatedHours: 12,
        academicWeight: 'High',
        difficulty: 'Medium',
      },
      {
        title: 'AI Assignment — A* Search Algorithm',
        subject: ai._id,
        description: 'Implement A* search and compare with BFS/DFS on a pathfinding problem.',
        type: 'Assignment',
        deadline: daysFromNow(6),
        estimatedHours: 4,
        academicWeight: 'Medium',
        difficulty: 'Hard',
      },
      {
        title: 'DBMS Quiz Preparation',
        subject: dbms._id,
        description: 'Revise SQL joins, stored procedures, and transaction management concepts.',
        type: 'Exam Preparation',
        deadline: daysFromNow(1),
        estimatedHours: 2,
        academicWeight: 'Critical',
        difficulty: 'Medium',
      },
      {
        title: 'DSA Quiz — Trees and Heaps',
        subject: dsa._id,
        description: 'Review AVL trees, heap operations, and complexity analysis.',
        type: 'Quiz',
        deadline: daysFromNow(3),
        estimatedHours: 1.5,
        academicWeight: 'Medium',
        difficulty: 'Hard',
      },
      {
        title: 'Web Tech Reading — REST API Design Patterns',
        subject: webdev._id,
        description: 'Read chapters 8-10 on REST API design and Node.js best practices.',
        type: 'Other',
        deadline: daysFromNow(10),
        estimatedHours: 1,
        academicWeight: 'Low',
        difficulty: 'Easy',
        status: 'Completed',
      },
    ];

    for (const taskData of tasksData) {
      const priority = calculateTaskPriority(taskData);
      await Task.create({
        user: user._id,
        ...taskData,
        priorityScore: priority.priorityScore,
        priorityLevel: priority.priorityLevel,
        priorityExplanation: priority.priorityExplanation,
      });
    }

    console.log('📋 Tasks created with computed priorities');

    // --- Create Exams ---
    const examsData = [
      {
        subject: dbms._id,
        name: 'DBMS End-Semester Examination',
        date: daysFromNow(21),
        syllabus: ['ER Diagrams', 'Relational Algebra', 'SQL & PL/SQL', 'Normalization', 'Transactions & Concurrency', 'Indexing & Query Optimization'],
        difficulty: 'Hard',
        targetScore: 75,
      },
      {
        subject: dsa._id,
        name: 'DSA Module Test 3',
        date: daysFromNow(5),
        syllabus: ['Graphs — BFS, DFS', 'Shortest Path Algorithms', 'Minimum Spanning Tree', 'Dynamic Programming'],
        difficulty: 'Hard',
        targetScore: 70,
      },
      {
        subject: aoc._id,
        name: 'AOC Internal Assessment',
        date: daysFromNow(5),
        syllabus: ['RC Circuits', 'RL Circuits', 'RLC Resonance', 'Frequency Response', 'Two-Port Networks'],
        difficulty: 'Hard',
        targetScore: 65,
      },
      {
        subject: ai._id,
        name: 'AI Mid-Semester Test',
        date: daysFromNow(12),
        syllabus: ['Search Algorithms', 'A* and Heuristics', 'Constraint Satisfaction', 'Knowledge Representation'],
        difficulty: 'Medium',
        targetScore: 70,
      },
    ];

    const createdExams = [];
    for (const examData of examsData) {
      const exam = await Exam.create({ user: user._id, ...examData });
      createdExams.push(exam);
    }

    console.log('📝 Exams created');

    // --- Create a Study Plan ---
    const { generateSchedule } = require('../services/studyPlanner');

    const schedule = generateSchedule({
      examDate: daysFromNow(21),
      availableHoursPerDay: 2,
      topics: ['ER Diagrams', 'Relational Algebra', 'SQL', 'PL/SQL', 'Normalization', 'Transactions', 'Indexing'],
      difficulty: 'Hard',
    });

    await StudyPlan.create({
      user: user._id,
      subject: dbms._id,
      exam: createdExams[0]._id,
      title: 'DBMS End-Semester Study Plan',
      examDate: daysFromNow(21),
      availableHoursPerDay: 2,
      topics: ['ER Diagrams', 'Relational Algebra', 'SQL', 'PL/SQL', 'Normalization', 'Transactions', 'Indexing'],
      difficulty: 'Hard',
      schedule,
    });

    console.log('📅 Study plan generated');
    console.log('\n✅ Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo credentials:');
    console.log(`  Email:    ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
