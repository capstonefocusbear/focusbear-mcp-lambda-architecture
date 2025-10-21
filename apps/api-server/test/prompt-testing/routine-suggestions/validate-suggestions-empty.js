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
  if (data.length !== 0) {
    throw new Error(`Expected empty array but received length ${data.length}`);
  }

  return true;
};
