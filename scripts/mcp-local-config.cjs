const fs = require('node:fs');
const allowed = new Set([
  'OAUTH_ISSUER',
  'OAUTH_JWKS_URL',
  'MCP_RESOURCE_URL',
  'MCP_ALLOWED_CLIENT_IDS',
  'MCP_TOKEN_PROFILE',
]);
const values = new Map();
for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue;
  const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
  if (!match) throw new Error('Use unquoted KEY=value dotenv syntax');
  if (allowed.has(match[1])) values.set(match[1], match[2]);
}
for (const key of ['OAUTH_ISSUER', 'OAUTH_JWKS_URL', 'MCP_RESOURCE_URL', 'MCP_ALLOWED_CLIENT_IDS']) {
  if (!values.get(key)) throw new Error(`Missing ${key}`);
}
for (const key of ['OAUTH_ISSUER', 'OAUTH_JWKS_URL']) {
  if (new URL(values.get(key)).protocol !== 'https:') throw new Error('Use a real HTTPS development Auth0 tenant');
}
for (const [key, value] of values) console.log(`export ${key}='${value.replaceAll("'", "'\\''")}'`);
