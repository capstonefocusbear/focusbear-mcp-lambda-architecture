module.exports = (output) => {
  try {
    const raw = typeof output === 'object' ? JSON.stringify(output) : String(output);
    const cleaned = raw.replace(/```json\n?/i, '').replace(/```/g, '').trim();
    const parsed = typeof output === 'object' ? output : JSON.parse(cleaned);

    // Handle both new object format { suggestions: [...] } and legacy array format
    let data;
    if (Array.isArray(parsed)) {
      data = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.suggestions)) {
      data = parsed.suggestions;
    } else {
      return {
        pass: false,
        score: 0,
        reason: 'Output is not an array or object with suggestions array',
      };
    }

    if (data.length === 0) {
      return {
        pass: false,
        score: 0,
        reason: 'Expected at least one suggestion, received none',
      };
    }

    for (let index = 0; index < data.length; index += 1) {
      const item = data[index];
      if (typeof item !== 'object' || item === null) {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} is not an object` };
      }
      if (!item.habitId || typeof item.habitId !== 'string') {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} is missing habitId` };
      }
      if (!item.name || typeof item.name !== 'string') {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} is missing name` };
      }
      if (!item.description || typeof item.description !== 'string') {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} is missing description` };
      }
      if (!item.justification || typeof item.justification !== 'string') {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} is missing justification` };
      }
      if (typeof item.matchScore !== 'number' || item.matchScore < 0 || item.matchScore > 1) {
        return { pass: false, score: 0, reason: `Suggestion at index ${index} has invalid matchScore` };
      }
    }

    return {
      pass: true,
      score: 1,
      reason: `Validated ${data.length} suggestion(s)`,
    };
  } catch (error) {
    return {
      pass: false,
      score: 0,
      reason: `Validation error: ${error instanceof Error ? error.message : error}`,
    };
  }
};
