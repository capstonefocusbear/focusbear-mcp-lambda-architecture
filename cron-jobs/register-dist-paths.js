const path = require('path');
const { register } = require('tsconfig-paths');
const isDist = __dirname.includes(`${path.sep}dist${path.sep}`);
const projectRoot = isDist ? path.resolve(__dirname, '..', '..') : path.resolve(__dirname, '..');
const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
const tsConfig = require(tsConfigPath);

const baseUrl = isDist ? path.resolve(__dirname, '..') : path.resolve(__dirname, '..');

const normalize = (value) => {
  const stripped = value.replace(/^\.\//, '');
  return isDist ? stripped : path.join('dist', stripped);
};

const distPaths = Object.entries(tsConfig.compilerOptions.paths || {}).reduce((acc, [alias, values]) => {
  acc[alias] = values.map(normalize);
  return acc;
}, {});

register({
  baseUrl,
  paths: distPaths,
});
