const path = require('path');
const { register } = require('tsconfig-paths');
const tsConfig = require('../tsconfig.json');

const baseUrl = path.resolve(__dirname, '..');

const normalize = (value) => {
  const stripped = value.replace(/^\.\//, '');
  return path.join('dist', stripped);
};

const distPaths = Object.entries(tsConfig.compilerOptions.paths || {}).reduce((acc, [alias, values]) => {
  acc[alias] = values.map(normalize);
  return acc;
}, {});

register({
  baseUrl,
  paths: distPaths,
});
