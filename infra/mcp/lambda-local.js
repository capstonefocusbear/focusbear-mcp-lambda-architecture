'use strict';
// LOCAL ONLY (Task 33). Stands in for the Lambda Web Adapter layer, which
// LocalStack's free plan cannot run.
//
// On cold start it:
//   1. reads the adapter signing key from Secrets Manager (architecture
//      proposal sections 5.2 and 5.3: Lambda secrets live in Secrets Manager),
//   2. starts the MCP server from main.js on 127.0.0.1:MCP_PORT,
// then forwards each API Gateway event to that server as a normal HTTP request.
// The private key is never logged.

const http = require('node:http');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const PORT = Number(process.env.MCP_PORT || 5039);

async function loadSigningKey() {
  const name = process.env.SIGNING_KEY_SECRET_NAME;
  if (!name) return;
  const sm = new SecretsManagerClient({});
  const out = await sm.send(new GetSecretValueCommand({ SecretId: name }));
  const secret = JSON.parse(out.SecretString);
  process.env.MCP_ADAPTER_SIGNING_KID = secret.kid;
  process.env.MCP_ADAPTER_SIGNING_PRIVATE_KEY = secret.privateKey;
  console.log(JSON.stringify({ msg: 'Loaded adapter signing key from Secrets Manager', secret: name, kid: secret.kid }));
}

async function start() {
  await loadSigningKey();
  const { createLocalHandler } = require('./main.js');
  await new Promise((resolve, reject) => {
    const server = http.createServer(createLocalHandler());
    server.once('error', reject);
    server.listen(PORT, '127.0.0.1', resolve);
  });
  console.log(JSON.stringify({ msg: 'MCP adapter listening', host: '127.0.0.1', port: PORT }));
}

function send(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

let ready;

exports.handler = async (event) => {
  ready = ready || start();
  await ready;
  const v2 = event.version === '2.0';
  const method = v2 ? event.requestContext.http.method : event.httpMethod;
  let path = v2 ? event.rawPath : event.path;
  const qs = v2 ? event.rawQueryString : new URLSearchParams(event.queryStringParameters || {}).toString();
  if (qs) path += '?' + qs;
  const headers = {};
  for (const [k, v] of Object.entries(event.headers || {})) headers[k.toLowerCase()] = v;
  let body = event.body || undefined;
  if (body && event.isBase64Encoded) body = Buffer.from(body, 'base64');
  if (body) headers['content-length'] = Buffer.byteLength(body);
  else delete headers['content-length'];
  const res = await send(method, path, headers, body);
  const out = {};
  for (const [k, v] of Object.entries(res.headers)) out[k] = Array.isArray(v) ? v.join(', ') : String(v);
  return { statusCode: res.status, headers: out, body: res.body };
};
