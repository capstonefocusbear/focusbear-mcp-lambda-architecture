module.exports = ({ output }) => {
  const data = JSON.parse(output);
  if (!Array.isArray(data)) {
    throw new Error('Output is not an array');
  }
  if (data.length === 0) {
    throw new Error('Expected at least one suggestion, received none');
  }

  data.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Suggestion at index ${index} is not an object`);
    }
    if (!item.habitId || typeof item.habitId !== 'string') {
      throw new Error(`Suggestion at index ${index} is missing habitId`);
    }
    if (!item.justification || typeof item.justification !== 'string') {
      throw new Error(`Suggestion at index ${index} is missing justification`);
    }
    if (typeof item.matchScore !== 'number' || item.matchScore < 0 || item.matchScore > 1) {
      throw new Error(`Suggestion at index ${index} has invalid matchScore`);
    }
  });

  return true;
};
