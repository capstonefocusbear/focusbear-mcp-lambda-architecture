module.exports = (output, context) => {
  const { vars } = context;
  const { min_habits, max_habits, expected_categories } = vars;

  let parsed;
  try {
    parsed = typeof output === 'string' ? JSON.parse(output) : output;
  } catch (e) {
    return {
      pass: false,
      score: 0,
      reason: `Failed to parse JSON output: ${e.message}`,
    };
  }

  if (!parsed || !Array.isArray(parsed.habits)) {
    return {
      pass: false,
      score: 0,
      reason: 'Output must be an object with a "habits" array',
    };
  }

  const habits = parsed.habits;
  const errors = [];

  // Check habit count
  if (min_habits !== undefined && habits.length < min_habits) {
    errors.push(`Expected at least ${min_habits} habits, got ${habits.length}`);
  }
  if (max_habits !== undefined && habits.length > max_habits) {
    errors.push(`Expected at most ${max_habits} habits, got ${habits.length}`);
  }

  // Validate each habit structure
  const validCategories = ['exercise', 'meditation', 'journaling', 'reading', 'learning', 'health', 'productivity', 'other'];

  habits.forEach((habit, index) => {
    if (!habit.name || typeof habit.name !== 'string') {
      errors.push(`Habit ${index + 1}: missing or invalid "name"`);
    }

    if (habit.estimatedDurationMinutes !== undefined) {
      if (typeof habit.estimatedDurationMinutes !== 'number' || habit.estimatedDurationMinutes < 1 || habit.estimatedDurationMinutes > 120) {
        errors.push(`Habit ${index + 1}: "estimatedDurationMinutes" must be a number between 1 and 120`);
      }
    }

    if (habit.category && !validCategories.includes(habit.category)) {
      errors.push(`Habit ${index + 1}: invalid category "${habit.category}". Must be one of: ${validCategories.join(', ')}`);
    }
  });

  // Check that at least some expected categories are represented
  if (expected_categories && Array.isArray(expected_categories) && expected_categories.length > 0) {
    const foundCategories = new Set(habits.map(h => h.category).filter(Boolean));
    const hasExpectedCategory = expected_categories.some(cat => foundCategories.has(cat));

    if (!hasExpectedCategory && habits.length > 0) {
      errors.push(`Expected at least one habit with category from: ${expected_categories.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return {
      pass: false,
      score: Math.max(0, 1 - errors.length * 0.2),
      reason: errors.join('; '),
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `Successfully extracted ${habits.length} habits`,
  };
};
