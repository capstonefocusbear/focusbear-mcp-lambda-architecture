module.exports = ({ output }) => {
  const data = JSON.parse(output);
  if (!Array.isArray(data)) {
    throw new Error('Output is not an array');
  }
  if (data.length !== 0) {
    throw new Error(`Expected empty array but received length ${data.length}`);
  }

  return true;
};
