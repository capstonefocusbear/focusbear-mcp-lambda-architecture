/**
 * Validates the response from the habit adjustment analysis.
 * Checks that the response contains valid habit data in the expected format.
 *
 * @param {string|object} output - The LLM response to validate
 * @param {object} context - Test context containing expected results
 * @returns {object} - A grading result object
 */
function isGroupedHabitsArray(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.goal === 'string' &&
      Array.isArray(item.habits)
  );
}

const SINGLE_EMOJI_REGEX =
  /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;

function validateSingleHabit(habit) {
  if (!habit.id || typeof habit.id !== 'string') {
    return {
      pass: false,
      score: 0.0,
      reason: 'Invalid or missing id in habit entry',
    };
  }
  if (!habit.name || typeof habit.name !== 'string') {
    return {
      pass: false,
      score: 0.0,
      reason: 'Invalid or missing name in habit entry',
    };
  }
  if (
    habit.duration_seconds === undefined ||
    typeof habit.duration_seconds !== 'number' ||
    !Number.isInteger(habit.duration_seconds)
  ) {
    return {
      pass: false,
      score: 0.0,
      reason: 'Invalid or missing duration_seconds in habit entry (must be integer)',
    };
  }
  if (typeof habit.emoji !== 'string' || !SINGLE_EMOJI_REGEX.test(habit.emoji.trim())) {
    return {
      pass: false,
      score: 0.0,
      reason: 'Invalid or missing emoji in habit entry (must be a single valid emoji)',
    };
  }
  // Check for extra fields (should only have id, name, duration_seconds, emoji)
  const allowedFields = ['id', 'name', 'duration_seconds', 'emoji'];
  const extraFields = Object.keys(habit).filter((key) => !allowedFields.includes(key));
  if (extraFields.length > 0) {
    return {
      pass: false,
      score: 0.0,
      reason: `Extra fields found: ${extraFields.join(', ')}. Only id, name, duration_seconds, and emoji are allowed.`,
    };
  }
  // Validate duration is reasonable (between 1 second and 24 hours)
  if (habit.duration_seconds < 1 || habit.duration_seconds > 86400) {
    return {
      pass: false,
      score: 0.0,
      reason: 'Duration must be between 1 second and 86400 seconds (24 hours)',
    };
  }
  return { pass: true };
}

function validateHabitAdjustment(output, context) {
  try {
    // Handle both cases where output could be an object or a string
    const result = typeof output === 'object' ? output : JSON.parse(output.replace(/```json|```/g, '').trim());

    // Detect grouped output
    if (isGroupedHabitsArray(result)) {
      // Validate each group
      for (const group of result) {
        if (!group.goal || typeof group.goal !== 'string') {
          return {
            pass: false,
            score: 0.0,
            reason: 'Each group must have a string goal',
          };
        }
        if (!Array.isArray(group.habits)) {
          return {
            pass: false,
            score: 0.0,
            reason: 'Each group must have a habits array',
          };
        }
        for (const habit of group.habits) {
          const habitValidation = validateSingleHabit(habit);
          if (!habitValidation.pass) return habitValidation;
        }
      }
      // If expected is grouped, compare groupings and habits
      if (context && context.vars && context.vars.expected) {
        const expected = JSON.parse(context.vars.expected);
        if (!isGroupedHabitsArray(expected)) {
          return {
            pass: false,
            score: 0.0,
            reason: 'Expected grouped output but expected value is not grouped',
          };
        }
        // Compare group count (warn if more groups than expected)
        if (result.length < expected.length) {
          return {
            pass: false,
            score: 0.5,
            reason: `Expected ${expected.length} groups but got ${result.length}`,
          };
        }
        let groupWarnings = [];
        for (const expectedGroup of expected) {
          const actualGroup = result.find((g) => g.goal === expectedGroup.goal);
          if (!actualGroup) {
            return {
              pass: false,
              score: 0.3,
              reason: `Expected group with goal '${expectedGroup.goal}' not found`,
            };
          }
          // Check for missing habits in the group
          const missingHabits = expectedGroup.habits.filter(
            expectedHabit => !actualGroup.habits.find(h => h.id === expectedHabit.id)
          );
          if (missingHabits.length > 0) {
            return {
              pass: false,
              score: 0.3,
              reason: `Expected habits with ids [${missingHabits.map(h => h.id).join(', ')}] not found in group '${expectedGroup.goal}'`,
            };
          }
          // Collect warnings for name/duration mismatches
          for (const expectedHabit of expectedGroup.habits) {
            const actualHabit = actualGroup.habits.find((h) => h.id === expectedHabit.id);
            if (actualHabit.name !== expectedHabit.name) {
              groupWarnings.push(`Group '${expectedGroup.goal}': Habit '${expectedHabit.id}' expected name '${expectedHabit.name}' but got '${actualHabit.name}'`);
            }
            if (actualHabit.duration_seconds !== expectedHabit.duration_seconds) {
              groupWarnings.push(`Group '${expectedGroup.goal}': Habit '${expectedHabit.id}' expected duration ${expectedHabit.duration_seconds} but got ${actualHabit.duration_seconds}`);
            }
          }
          // Warn if there are extra habits in the group
          if (actualGroup.habits.length > expectedGroup.habits.length) {
            const extraIds = actualGroup.habits.map(h => h.id).filter(id => !expectedGroup.habits.some(eh => eh.id === id));
            groupWarnings.push(`Group '${expectedGroup.goal}' contains extra habits with ids: [${extraIds.join(', ')}]`);
          }
        }
        // Warn if there are extra groups
        if (result.length > expected.length) {
          const extraGoals = result.map(g => g.goal).filter(goal => !expected.some(eg => eg.goal === goal));
          groupWarnings.push(`Extra groups found: [${extraGoals.join(', ')}]`);
        }
        // All groups and habits present
        return {
          pass: true,
          score: 1.0,
          reason: groupWarnings.length > 0 ? `Grouped test passed with warnings: ${groupWarnings.join('; ')}` : 'Grouped response matches expected habit data exactly',
        };
      }
      // If we get here, the grouped response is valid but no expected data to compare
      return {
        pass: true,
        score: 1.0,
        reason: 'Grouped response contains valid habit data in the expected format',
      };
    }

    // Flat array validation (legacy)
    if (!Array.isArray(result)) {
      return {
        pass: false,
        score: 0.0,
        reason: 'Response must be a JSON array',
      };
    }
    for (const habit of result) {
      const habitValidation = validateSingleHabit(habit);
      if (!habitValidation.pass) return habitValidation;
    }
    // If expected results are provided, validate against them
    if (context && context.vars && context.vars.expected) {
      const expected = JSON.parse(context.vars.expected);
      // Check that all expected habits are present in the result
      const missingHabits = expected.filter(
        expectedHabit => !result.find(h => h.id === expectedHabit.id)
      );
      if (missingHabits.length > 0) {
        return {
          pass: false,
          score: 0.3,
          reason: `Expected habits with ids [${missingHabits.map(h => h.id).join(', ')}] not found`,
        };
      }
      // Collect warnings for name/duration mismatches
      let warnings = [];
      for (const expectedHabit of expected) {
        const actualHabit = result.find((h) => h.id === expectedHabit.id);
        if (actualHabit.name !== expectedHabit.name) {
          warnings.push(`Habit '${expectedHabit.id}' expected name '${expectedHabit.name}' but got '${actualHabit.name}'`);
        }
        if (actualHabit.duration_seconds !== expectedHabit.duration_seconds) {
          warnings.push(`Habit '${expectedHabit.id}' expected duration ${expectedHabit.duration_seconds} but got ${actualHabit.duration_seconds}`);
        }
      }
      // Warn if there are extra habits
      if (result.length > expected.length) {
        const extraIds = result.map(h => h.id).filter(id => !expected.some(eh => eh.id === id));
        warnings.push(`Response contains extra habits with ids: [${extraIds.join(', ')}]. This is allowed, but you may want to review if the breakdown is reasonable.`);
      }
      // If we get here, all expected habits are present
      return {
        pass: true,
        score: 1.0,
        reason: warnings.length > 0 ? `Test passed with warnings: ${warnings.join('; ')}` : 'Response matches expected habit data exactly',
      };
    }
    // If we get here, the response is valid but no expected data to compare
    return {
      pass: true,
      score: 1.0,
      reason: 'Response contains valid habit data in the expected format',
    };
  } catch (error) {
    return {
      pass: false,
      score: 0.0,
      reason: `Error validating: ${error.message}`,
    };
  }
}

module.exports = validateHabitAdjustment;
