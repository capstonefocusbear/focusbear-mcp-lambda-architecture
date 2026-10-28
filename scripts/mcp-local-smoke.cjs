const assert = require('node:assert/strict');
(async () => {
  const resource = new URL(process.env.MCP_RESOURCE_URL);
  const target = new URL(process.env.MCP_SMOKE_URL || resource);
  // Local-only invocations; never send a development bearer token to arbitrary hosts.
  if (
    target.protocol !== 'http:' ||
    (!['localhost', '127.0.0.1'].includes(target.hostname) && !target.hostname.endsWith('.localhost.localstack.cloud'))
  )
    throw new Error('Smoke target must be local HTTP');
  const headers = {
    Host: resource.host,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': '2026-07-28',
    'mcp-method': 'tools/list',
  };
  const root = new URL(target);
  root.pathname = target.pathname.replace(/\/mcp$/, '/.well-known/oauth-protected-resource/mcp');
  const meta = {
    'io.modelcontextprotocol/protocolVersion': '2026-07-28',
    'io.modelcontextprotocol/clientCapabilities': {},
  };
  const request = (url, init) => fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  const metadata = await request(root, { headers: { Host: resource.host } });
  assert.equal(metadata.status, 200);
  assert.equal((await metadata.json()).resource, resource.href);
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: meta } });
  const anonymous = await request(target, { method: 'POST', headers, body });
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get('www-authenticate'), /Bearer/);
  if (!process.env.MCP_ACCESS_TOKEN) {
    console.log('Discovery and anonymous rejection passed. Authenticated acceptance NOT RUN: set MCP_ACCESS_TOKEN.');
    return;
  }
  const authorized = await request(target, {
    method: 'POST',
    headers: { ...headers, Authorization: `Bearer ${process.env.MCP_ACCESS_TOKEN}` },
    body,
  });
  assert.equal(authorized.status, 200);
  const result = await authorized.json();
  assert.ok(Array.isArray(result.result?.tools));
  const toolName = 'focusware_list_assigned_tasks';
  const tool = await request(target, {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: `Bearer ${process.env.MCP_ACCESS_TOKEN}`,
      'mcp-method': 'tools/call',
      'mcp-name': toolName,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { _meta: meta, name: toolName, arguments: { page: 1, take: 1 } },
    }),
  });
  assert.equal(tool.status, 200);
  const call = await tool.json();
  assert.ok(
    call.result && !call.error && !call.result.isError,
    'Assigned-task read must reach and pass backend authorization',
  );
  assert.ok(Array.isArray(JSON.parse(call.result.content[0].text).data));
  console.log(
    'Discovery, anonymous rejection, authenticated tools/list and backend assigned-task read passed. Mutations/ownership still require live acceptance.',
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
