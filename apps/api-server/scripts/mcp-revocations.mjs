/** Run only from a trusted operator workstation; never deploy credentials to the MCP adapter. */
const api = new URL(process.env.FOCUSBEAR_API_URL);
const token = process.env.FOCUSBEAR_ADMIN_TOKEN;
if (api.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(api.hostname))
  throw new Error('HTTPS API required');
if (!token) throw new Error('FOCUSBEAR_ADMIN_TOKEN required');
async function call(path, body) {
  const response = await fetch(new URL(path, api), {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Administrative API returned ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
const pending = await call('/mcp/auth/revocations');
if (process.argv[2] === 'list') {
  console.log(JSON.stringify(pending, null, 2));
} else if (process.argv[2] === 'confirm') {
  const [id, revision, evidence] = process.argv.slice(3);
  if (!id || !revision || !evidence || evidence.length < 10)
    throw new Error('Usage: confirm CONNECTION_ID REVISION AUDIT_EVIDENCE');
  if (!pending.some((item) => item.id === id && item.revision === revision))
    throw new Error('Pending connection revision changed; list again');
  await call(`/mcp/auth/agents/${encodeURIComponent(id)}/revocation-complete`, { revision, evidence });
  console.log('Administrative revocation recorded. Connection remains disabled until the user reconnects.');
} else {
  throw new Error('Usage: node apps/api-server/scripts/mcp-revocations.mjs list|confirm');
}
