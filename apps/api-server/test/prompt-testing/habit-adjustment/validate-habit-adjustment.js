/**
 * Validates the response from the habit adjustment analysis.
 * Checks that the response contains valid habit data in the expected format.
 *
 * @param {string|object} output - The LLM response to validate
 * @param {object} context - Test context containing expected results
 * @returns {object} - A grading result object
 */
function validateHabitAdjustment(output, context) {
  try {
    // Handle both cases where output could be an object or a string
    const result = typeof output === 'object' ? output : JSON.parse(output.replace(/```json|```/g, '').trim());

    // Validate that result is an array
    if (!Array.isArray(result)) {
      return {
        pass: false,
        score: 0.0,
        reason: 'Response must be a JSON array',
      };
    }

    // Validate each habit entry
    for (const habit of result) {
      // Check required fields
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
        !habit.duration_seconds ||
        typeof habit.duration_seconds !== 'number' ||
        !Number.isInteger(habit.duration_seconds)
      ) {
        return {
          pass: false,
          score: 0.0,
          reason: 'Invalid or missing duration_seconds in habit entry (must be integer)',
        };
      }

      // Check for extra fields (should only have id, name, duration_seconds)
      const allowedFields = ['id', 'name', 'duration_seconds'];
      const extraFields = Object.keys(habit).filter((key) => !allowedFields.includes(key));

      if (extraFields.length > 0) {
        return {
          pass: false,
          score: 0.0,
          reason: `Extra fields found: ${extraFields.join(', ')}. Only id, name, and duration_seconds are allowed.`,
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
    }

    // If expected results are provided, validate against them
    if (context && context.vars && context.vars.expected) {
      const expected = JSON.parse(context.vars.expected);

      // Check if we have the same number of habits
      if (result.length !== expected.length) {
        return {
          pass: false,
          score: 0.5,
          reason: `Expected ${expected.length} habits but got ${result.length}`,
        };
      }

      // Check each expected habit
      for (const expectedHabit of expected) {
        const actualHabit = result.find((h) => h.id === expectedHabit.id);

        if (!actualHabit) {
          return {
            pass: false,
            score: 0.3,
            reason: `Expected habit with id '${expectedHabit.id}' not found`,
          };
        }

        // Check name matches
        if (actualHabit.name !== expectedHabit.name) {
          return {
            pass: false,
            score: 0.7,
            reason: `Expected habit '${expectedHabit.id}' to have name '${expectedHabit.name}' but got '${actualHabit.name}'`,
          };
        }

        // Check duration matches
        if (actualHabit.duration_seconds !== expectedHabit.duration_seconds) {
          return {
            pass: false,
            score: 0.7,
            reason: `Expected habit '${expectedHabit.id}' to have duration ${expectedHabit.duration_seconds} seconds but got ${actualHabit.duration_seconds} seconds`,
          };
        }
      }

      // If we get here, all expected habits match
      return {
        pass: true,
        score: 1.0,
        reason: 'Response matches expected habit data exactly',
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
