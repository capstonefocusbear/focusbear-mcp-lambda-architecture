import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(__dirname, '../../../../..');

test('dotenv export safely quotes untrusted text and rejects incomplete configuration', () => {
  const temp = mkdtempSync(join(tmpdir(), 'mcp-config-'));
  try {
    const config = join(temp, 'config');
    const marker = join(temp, 'executed');
    const malicious = `test'; touch ${marker}; echo '$(touch ${marker})`;
    writeFileSync(
      config,
      `OAUTH_ISSUER=https://test.auth0.com/\nOAUTH_JWKS_URL=https://test.auth0.com/.well-known/jwks.json\nMCP_RESOURCE_URL=http://localhost:5039/mcp\nMCP_ALLOWED_CLIENT_IDS=${malicious}\nMCP_AUTH0_ENABLED=true\n`,
    );
    const parsed = spawnSync(process.execPath, ['scripts/mcp-local-config.cjs', config], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(parsed.status, 0, parsed.stderr);
    const result = spawnSync(
      'bash',
      ['-c', `${parsed.stdout}\nnode -e 'process.stdout.write(process.env.MCP_ALLOWED_CLIENT_IDS)'`],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, malicious);
    assert.throws(() => readFileSync(marker));
    writeFileSync(config, 'OAUTH_ISSUER=https://test.auth0.com/\n');
    const failed = spawnSync('bash', ['scripts/mcp-local.sh', 'smoke'], {
      cwd: root,
      env: { ...process.env, MCP_ENV_FILE: config },
      encoding: 'utf8',
    });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /Missing OAUTH_JWKS_URL/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('deploy forces local AWS credentials and rejects real ECR before any push', () => {
  const temp = mkdtempSync(join(tmpdir(), 'mcp-guard-'));
  try {
    const config = join(temp, 'config');
    writeFileSync(
      config,
      'OAUTH_ISSUER=https://test.auth0.com/\nOAUTH_JWKS_URL=https://test.auth0.com/.well-known/jwks.json\nMCP_RESOURCE_URL=http://localhost:5039/mcp\nMCP_ALLOWED_CLIENT_IDS=approved\n',
    );
    const log = join(temp, 'calls');
    writeFileSync(join(temp, 'docker'), `#!/bin/bash\necho "docker $*" >> '${log}'\nexit 0\n`, { mode: 0o755 });
    writeFileSync(
      join(temp, 'aws'),
      `#!/bin/bash
[[ "$1" == '--endpoint-url' && "$2" == 'http://127.0.0.1:4566' && "$AWS_ACCESS_KEY_ID" == test && "$AWS_SECRET_ACCESS_KEY" == test && -z "$AWS_SESSION_TOKEN" && "$AWS_CONFIG_FILE" == /dev/null ]] || exit 9
if [[ "$*" == *'get-caller-identity'* ]]; then echo 000000000000; else echo '123456789012.dkr.ecr.us-east-1.amazonaws.com/focusbear-mcp'; fi
`,
      { mode: 0o755 },
    );
    const result = spawnSync('bash', ['scripts/mcp-local.sh', 'deploy'], {
      cwd: root,
      env: {
        ...process.env,
        PATH: `${temp}:${process.env.PATH}`,
        MCP_ENV_FILE: config,
        AWS_ACCESS_KEY_ID: 'real-looking-input',
        AWS_SECRET_ACCESS_KEY: 'input-secret',
        AWS_SESSION_TOKEN: 'session',
        AWS_ENDPOINT_URL: 'https://aws.example',
      },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing non-local ECR/);
    assert.doesNotMatch(readFileSync(log, 'utf8'), /docker (push|login|tag)/);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('smoke exercises strict protocol and backend read without printing bearer', async () => {
  const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');
  const calls: string[] = [];
  let resource = '';
  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.method === 'GET') {
      res.end(JSON.stringify({ resource }));
      return;
    }
    if (!req.headers.authorization) {
      res.writeHead(401, { 'www-authenticate': 'Bearer' });
      res.end('{}');
      return;
    }
    let text = '';
    for await (const chunk of req) text += chunk;
    const body = JSON.parse(text);
    if (
      body.params?._meta?.['io.modelcontextprotocol/protocolVersion'] !== req.headers['mcp-protocol-version'] ||
      !body.params?._meta?.['io.modelcontextprotocol/clientCapabilities'] ||
      body.method !== req.headers['mcp-method']
    ) {
      res.writeHead(400);
      res.end('{}');
      return;
    }
    calls.push(body.method);
    if (body.method === 'tools/list') res.end(JSON.stringify({ result: { tools: [] } }));
    else if (body.method === 'tools/call' && body.params.name === req.headers['mcp-name'])
      res.end(JSON.stringify({ result: { content: [{ type: 'text', text: JSON.stringify({ data: [] }) }] } }));
    else {
      res.writeHead(400);
      res.end('{}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    resource = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}/mcp`;
    const child = spawn(process.execPath, ['scripts/mcp-local-smoke.cjs'], {
      cwd: root,
      env: {
        ...process.env,
        MCP_RESOURCE_URL: resource,
        MCP_SMOKE_URL: resource,
        MCP_ACCESS_TOKEN: 'fixture-sensitive-token',
      },
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const code = await new Promise((resolve) => child.on('close', resolve));
    assert.equal(code, 0, output);
    assert.deepEqual(calls, ['tools/list', 'tools/call']);
    assert.doesNotMatch(output, /fixture-sensitive-token/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
