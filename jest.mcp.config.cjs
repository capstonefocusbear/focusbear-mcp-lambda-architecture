// Runtime tests transpile independently of the source typechecks in mcp:check.
// This avoids ts-jest retaining the entire Nest/SDK/Zod type graph per suite.
module.exports = {
  ...require('./package.json').jest,
  rootDir: __dirname,
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { isolatedModules: true }, diagnostics: false }] },
};
