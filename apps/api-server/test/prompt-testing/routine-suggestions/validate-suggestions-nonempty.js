module.exports = (result) => {
  const { output, response, error } = result ?? {};

  if (output == null) {
    const details = response ?? error ?? result;
    throw new Error(
      `Model did not return a response. Check provider configuration or API key. Raw response: ${JSON.stringify(details)}`,
    );
  }

  const cleanedOutput = output.replace(/```json\n?/i, '').replace(/```/g, '').trim();

  let data;
  try {
    data = JSON.parse(cleanedOutput);
  } catch (error) {
    throw new Error(`Output is not valid JSON: ${cleanedOutput}`);
  }
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
