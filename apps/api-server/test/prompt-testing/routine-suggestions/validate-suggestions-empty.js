module.exports = (output) => {
  try {
    let suggestions;

    if (typeof output === 'object' && output !== null) {
      suggestions = Array.isArray(output) ? output : output.suggestions || output;
    } else if (typeof output === 'string') {
      const cleaned = output.replace(/```json|```/gi, '').trim();
      if (!cleaned || cleaned === 'undefined' || cleaned === 'null') {
        suggestions = [];
      } else {
        const parsed = JSON.parse(cleaned);
        suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || parsed;
      }
    } else {
      throw new Error('Response is neither an object nor a string');
    }

    if (!Array.isArray(suggestions)) {
      throw new Error('Response must be a JSON array of suggestions');
    }

    if (suggestions.length !== 0) {
      throw new Error(`Expected empty array but received length ${suggestions.length}`);
    }

    return {
      pass: true,
      score: 1.0,
      reason: 'Output correctly returned an empty array',
    };
  } catch (error) {
    return {
      pass: false,
      score: 0.0,
      reason: `Validation failed: ${error instanceof Error ? error.message : error}`,
    };
  }
};
