/**
 * Validates that the allowed_probability in the response falls within
 * the specified minimum and maximum values.
 *
 * @param {string|object} output - The LLM response to validate
 * @param {object} context - The test context containing variables and configuration
 * @returns {object} - A grading result object
 */
function validateProbability(output, context) {
  try {
    // Handle both cases where output could be an object or a string
    const result = typeof output === 'object' ? output : JSON.parse(output.replace(/```json|```/g, '').trim());
    const prob = result.allowed_probability;
    const min = context.vars.min_probability;
    const max = context.vars.max_probability;

    const pass = prob >= min && prob <= max;

    return {
      pass,
      score: pass ? 1.0 : 0.0,
      reason: pass
        ? `Probability ${prob} is within range [${min}, ${max}]`
        : `Probability ${prob} is outside range [${min}, ${max}]`,
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
