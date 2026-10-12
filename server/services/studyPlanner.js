/**
 * Study Planner Service — CampusFlow AI
 *
 * Generates an intelligent day-by-day study schedule based on:
 * - Available study hours per day
 * - Number of topics
 * - Exam date (total days available)
 * - Subject difficulty
 *
 * The planner reserves the final days for revision, practice, and mock tests
 * rather than treating every day identically.
 */

/**
 * Get a difficulty multiplier to adjust topic coverage pace.
 */
const getDifficultyMultiplier = (difficulty) => {
  const map = { Easy: 1.2, Medium: 1.0, Hard: 0.75 };
  return map[difficulty] || 1.0;
};

/**
 * Generate a daily study schedule.
 *
 * @param {Object} params
 * @param {Date|string} params.examDate - The exam date
 * @param {number} params.availableHoursPerDay - Hours the student can study each day
 * @param {string[]} params.topics - Array of topic names to cover
 * @param {string} params.difficulty - 'Easy' | 'Medium' | 'Hard'
 * @returns {Array} Array of daily schedule entries
 */
const generateSchedule = ({ examDate, availableHoursPerDay, topics, difficulty }) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);

  const totalDays = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));

  if (totalDays <= 0) {
    return [{ day: 1, date: now, topic: 'Exam is today — final revision!', sessionType: 'Mock Test', hoursPlanned: availableHoursPerDay, completed: false }];
  }

  const difficultyMultiplier = getDifficultyMultiplier(difficulty);

  // Reserve last days based on total available days
  let reservedDays;
  if (totalDays <= 3) reservedDays = 1;
  else if (totalDays <= 7) reservedDays = 2;
  else if (totalDays <= 14) reservedDays = 3;
  else reservedDays = Math.max(3, Math.ceil(totalDays * 0.2));

  const studyDays = totalDays - reservedDays;
  const schedule = [];

  // --- Phase 1: Topic coverage ---
  if (topics.length === 0 || studyDays <= 0) {
    // No topics or no study days — straight to revision
  } else {
    // Distribute topics across study days
    // Harder subjects get fewer topics per day (multiplier < 1)
    const effectiveTopicsPerDay = Math.max(1, Math.floor(topics.length / studyDays) * difficultyMultiplier);
    let topicIndex = 0;

    for (let day = 1; day <= studyDays && topicIndex < topics.length; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day - 1);

      // Number of topics for this day
      const topicsForDay = Math.min(
        Math.ceil(effectiveTopicsPerDay),
        topics.length - topicIndex
      );

      const dayTopics = topics.slice(topicIndex, topicIndex + topicsForDay).join(' + ');
      topicIndex += topicsForDay;

      schedule.push({
        day,
        date,
        topic: dayTopics,
        sessionType: 'Study',
        hoursPlanned: availableHoursPerDay,
        completed: false,
      });
    }

    // If topics run out before study days are over, use remaining for revision
    for (let day = schedule.length + 1; day <= studyDays; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() + day - 1);
      schedule.push({
        day,
        date,
        topic: 'Quick Recap — All Topics',
        sessionType: 'Revision',
        hoursPlanned: availableHoursPerDay,
        completed: false,
      });
    }
  }

  // --- Phase 2: Reserved revision/practice days ---
  const reservedSessionTypes = ['Revision', 'Practice', 'Mock Test'];
  const reservedTopics = [
    'Comprehensive Revision — All Units',
    'Practice Questions & Problem Solving',
    'Mock Test / Final Exam Simulation',
  ];

  for (let i = 0; i < reservedDays; i++) {
    const day = studyDays + i + 1;
    const date = new Date(now);
    date.setDate(now.getDate() + day - 1);

    const sessionIndex = Math.min(i, reservedSessionTypes.length - 1);

    schedule.push({
      day,
      date,
      topic: reservedTopics[sessionIndex],
      sessionType: reservedSessionTypes[sessionIndex],
      hoursPlanned: availableHoursPerDay,
      completed: false,
    });
  }

  return schedule;
};

/**
 * Estimate total study hours for a schedule.
 */
const estimateTotalHours = (schedule) =>
  schedule.reduce((sum, entry) => sum + entry.hoursPlanned, 0);

module.exports = { generateSchedule, estimateTotalHours };
