/**
 * Validates the response from the iPhone Screen Time summary analysis.
 * Checks that the response contains valid app data in the expected format.
 *
 * @param {string|object} output - The LLM response to validate
 * @returns {object} - A grading result object
 */
function validateProbability(output) {
  try {
    // Handle both cases where output could be an object or a string
    const result = typeof output === 'object' ? output : JSON.parse(output.replace(/```json|```/g, '').trim());

    // Validate the response structure
    if (!result.apps || !Array.isArray(result.apps)) {
      return {
        pass: false,
        score: 0.0,
        reason: 'Response missing apps array',
      };
    }

    // Validate each app entry
    const validCategories = [
      'MISC',
      'GAME',
      'AUDIO',
      'VIDEO',
      'IMAGE',
      'SOCIAL',
      'NEWS',
      'MAPS',
      'PRODUCTIVITY',
      'ACCESSIBILITY',
    ];

    for (const app of result.apps) {
      if (!app.sourceName || typeof app.sourceName !== 'string') {
        return {
          pass: false,
          score: 0.0,
          reason: 'Invalid or missing sourceName in app entry',
        };
      }

      if (!app.minutesUsedTotal || typeof app.minutesUsedTotal !== 'number') {
        return {
          pass: false,
          score: 0.0,
          reason: 'Invalid or missing minutesUsedTotal in app entry',
        };
      }

      if (!app.category || !validCategories.includes(app.category)) {
        return {
          pass: false,
          score: 0.0,
          reason: 'Invalid or missing category in app entry',
        };
      }
    }

    // If we get here, the response is valid
    return {
      pass: true,
      score: 1.0,
      reason: 'Response contains valid app data in the expected format',
    };
  } catch (error) {
    return {
      pass: false,
      score: 0.0,
      reason: `Error validating: ${error.message}`,
    };
  }
}

module.exports = validateProbability;
