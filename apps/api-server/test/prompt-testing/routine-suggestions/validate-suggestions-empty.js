module.exports = ({ output }) => {
  if (typeof output !== 'string') {
    throw new Error(`Expected string output but received ${typeof output}`);
  }

  let data;
  try {
    data = JSON.parse(output);
  } catch (error) {
    throw new Error(`Output is not valid JSON: ${output}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('Output is not an array');
  }
  if (data.length !== 0) {
    throw new Error(`Expected empty array but received length ${data.length}`);
  }

  return true;
};
