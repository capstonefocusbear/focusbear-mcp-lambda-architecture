/**
 * Validates the response from the habit adjustment analysis.
 * Checks that the response contains valid habit data in the expected format.
 *
 * @param {string|object} output - The LLM response to validate
 * @returns {object} - A grading result object
 */
function validateHabitAdjustment(output) {
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

      if (!habit.duration_seconds || typeof habit.duration_seconds !== 'number' || !Number.isInteger(habit.duration_seconds)) {
        return {
          pass: false,
          score: 0.0,
          reason: 'Invalid or missing duration_seconds in habit entry (must be integer)',
        };
      }

      // Check for extra fields (should only have id, name, duration_seconds)
      const allowedFields = ['id', 'name', 'duration_seconds'];
      const extraFields = Object.keys(habit).filter(key => !allowedFields.includes(key));
      
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

    // If we get here, the response is valid
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
