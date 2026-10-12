/**
 * Priority Engine — CampusFlow AI
 *
 * Calculates a transparent, explainable priority score for academic tasks.
 * This is NOT a simple sort by deadline. Every factor is weighted and explained.
 *
 * Architecture note: This service is intentionally separate from CRUD controllers.
 * In future versions, this scoring logic can be replaced with an ML model
 * without touching any route, controller, or database layer.
 */

// Weight configuration — tweak these to tune the engine
const WEIGHTS = {
  urgency: 40,      // How time-sensitive the task is (0–40 pts)
  effort: 20,       // How much work the task requires (0–20 pts)
  academic: 25,     // Academic importance / grade impact (0–25 pts)
  difficulty: 15,   // Cognitive demand (0–15 pts)
};

// Urgency score based on days remaining until deadline
const getUrgencyScore = (daysRemaining) => {
  if (daysRemaining < 0) return WEIGHTS.urgency;       // Overdue → maximum urgency
  if (daysRemaining === 0) return WEIGHTS.urgency;     // Due today
  if (daysRemaining === 1) return WEIGHTS.urgency * 0.95;
  if (daysRemaining <= 2) return WEIGHTS.urgency * 0.85;
  if (daysRemaining <= 3) return WEIGHTS.urgency * 0.70;
  if (daysRemaining <= 5) return WEIGHTS.urgency * 0.50;
  if (daysRemaining <= 7) return WEIGHTS.urgency * 0.30;
  if (daysRemaining <= 14) return WEIGHTS.urgency * 0.15;
  return WEIGHTS.urgency * 0.05;
};

// Effort score — more hours needed means higher priority (can't leave it last minute)
const getEffortScore = (estimatedHours) => {
  if (estimatedHours >= 10) return WEIGHTS.effort;
  if (estimatedHours >= 7) return WEIGHTS.effort * 0.85;
  if (estimatedHours >= 5) return WEIGHTS.effort * 0.70;
  if (estimatedHours >= 3) return WEIGHTS.effort * 0.50;
  if (estimatedHours >= 1) return WEIGHTS.effort * 0.30;
  return WEIGHTS.effort * 0.10;
};

// Academic weight score — based on declared importance
const getAcademicWeightScore = (academicWeight) => {
  const weightMap = {
    Critical: WEIGHTS.academic,
    High: WEIGHTS.academic * 0.80,
    Medium: WEIGHTS.academic * 0.50,
    Low: WEIGHTS.academic * 0.20,
  };
  return weightMap[academicWeight] || WEIGHTS.academic * 0.50;
};

// Difficulty score — harder tasks need earlier attention
const getDifficultyScore = (difficulty) => {
  const difficultyMap = {
    Hard: WEIGHTS.difficulty,
    Medium: WEIGHTS.difficulty * 0.60,
    Easy: WEIGHTS.difficulty * 0.25,
  };
  return difficultyMap[difficulty] || WEIGHTS.difficulty * 0.60;
};

// Classify normalized score (0–100) into priority level
const classifyPriority = (normalizedScore) => {
  if (normalizedScore >= 65) return 'HIGH';
  if (normalizedScore >= 35) return 'MEDIUM';
  return 'LOW';
};

// Build a human-readable explanation of why this task received its priority
const buildExplanation = (task, daysRemaining, scores, priorityLevel) => {
  const reasons = [];

  if (daysRemaining < 0) {
    reasons.push(`this task is overdue by ${Math.abs(daysRemaining)} day(s)`);
  } else if (daysRemaining === 0) {
    reasons.push('the deadline is today');
  } else if (daysRemaining <= 2) {
    reasons.push(`the deadline is in ${daysRemaining} day(s)`);
  } else if (daysRemaining <= 5) {
    reasons.push(`the deadline is approaching in ${daysRemaining} days`);
  }

  if (task.estimatedHours >= 5) {
    reasons.push(`it requires significant effort (~${task.estimatedHours} hours)`);
  }

  if (task.academicWeight === 'Critical' || task.academicWeight === 'High') {
    reasons.push(`it has ${task.academicWeight.toLowerCase()} academic importance`);
  }

  if (task.difficulty === 'Hard') {
    reasons.push('it is rated as difficult, requiring more preparation time');
  }

  if (reasons.length === 0) {
    return `This task has been classified as ${priorityLevel} priority based on its deadline, effort, and academic weight.`;
  }

  const reasonText = reasons.join(', ');
  return `${priorityLevel.charAt(0) + priorityLevel.slice(1).toLowerCase()} Priority because ${reasonText}.`;
};

/**
 * Calculate priority for a single task.
 * @param {Object} task - Task document (can be plain object or Mongoose document)
 * @returns {Object} { priorityScore, priorityLevel, priorityExplanation }
 */
const calculateTaskPriority = (task) => {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil((deadline - now) / msPerDay);

  const urgencyScore = getUrgencyScore(daysRemaining);
  const effortScore = getEffortScore(task.estimatedHours);
  const academicScore = getAcademicWeightScore(task.academicWeight);
  const difficultyScore = getDifficultyScore(task.difficulty);

  const rawScore = urgencyScore + effortScore + academicScore + difficultyScore;
  const maxPossible = WEIGHTS.urgency + WEIGHTS.effort + WEIGHTS.academic + WEIGHTS.difficulty;
  const normalizedScore = Math.round((rawScore / maxPossible) * 100);

  const priorityLevel = classifyPriority(normalizedScore);

  const scores = { urgencyScore, effortScore, academicScore, difficultyScore };
  const priorityExplanation = buildExplanation(task, daysRemaining, scores, priorityLevel);

  return {
    priorityScore: normalizedScore,
    priorityLevel,
    priorityExplanation,
    breakdown: {
      urgency: Math.round(urgencyScore),
      effort: Math.round(effortScore),
      academic: Math.round(academicScore),
      difficulty: Math.round(difficultyScore),
    },
  };
};

/**
 * Calculate and sort priorities for a list of tasks.
 * @param {Array} tasks - Array of task documents
 * @returns {Array} Tasks sorted by priority score, each with computed priority fields
 */
const calculatePriorities = (tasks) => {
  const enriched = tasks
    .filter((task) => task.status !== 'Completed')
    .map((task) => {
      const priority = calculateTaskPriority(task);
      return {
        ...task.toObject ? task.toObject() : task,
        ...priority,
      };
    });

  // Sort: HIGH first, then by score descending
  return enriched.sort((a, b) => b.priorityScore - a.priorityScore);
};

module.exports = { calculateTaskPriority, calculatePriorities };
