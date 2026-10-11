import { Body, Controller, Delete, Get, Param, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { oauthError, OAuthService } from './oauth.service';

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

@Controller()
@ApiTags('mcp-oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  private secure(reply: FastifyReply) {
    reply.header('Cache-Control', 'no-store').header('Pragma', 'no-cache').header('Referrer-Policy', 'no-referrer');
  }

  private cookieName() {
    return this.oauth.config().issuer.startsWith('https:') ? '__Host-mcp_login' : 'mcp_login';
  }

  private browser(req: FastifyRequest): string {
    const prefix = `${this.cookieName()}=`;
    const matches = (req.headers.cookie || '')
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.startsWith(prefix));
    const value = matches.length === 1 ? matches[0].slice(prefix.length) : '';
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
  }

  @Get('.well-known/oauth-authorization-server')
  @ApiOperation({ summary: 'Focus Bear MCP authorization server metadata' })
  metadata() {
    return this.oauth.metadata();
  }

  @Get('.well-known/jwks.json')
  @ApiOperation({ summary: 'Public MCP access-token verification keys' })
  jwks() {
    return this.oauth.config().jwks;
  }

  @Get('oauth/authorize')
  @ApiOperation({ summary: 'Start MCP authorization with Auth0 login and S256 PKCE' })
  async authorize(@Query() query: unknown, @Res() reply: FastifyReply) {
    this.secure(reply);
    const result = await this.oauth.authorize(query);
    const secure = this.oauth.config().issuer.startsWith('https:') ? '; Secure' : '';
    reply.header(
      'Set-Cookie',
      `${this.cookieName()}=${result.browser}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${secure}`,
    );
    return reply.status(302).redirect(result.url);
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Verify Auth0 login and display MCP grant consent' })
  async callback(@Query() query: unknown, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    this.secure(reply);
    const consent = await this.oauth.callback(query, this.browser(req));
    const options = consent.grants
      .filter((g) => consent.request.scope.split(' ').every((s) => g.scopes.includes(s)))
      .map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.agent_label)} (${escapeHtml(g.id)})</option>`)
      .join('');
    reply.header(
      'Content-Security-Policy',
      "default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    return reply.type('text/html')
      .send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Focus Bear MCP consent</title>
      <h1>Connect an MCP agent</h1><p>Client: ${escapeHtml(consent.request.client_id)}</p>
      <p>Permissions: ${escapeHtml(consent.request.scope)}</p>
      <p>Read permission allows reading assigned tasks. Write permission allows updating assigned tasks,
      adding notes, and creating shared project statuses in eligible projects.</p>
      <form method="post" action="/oauth/consent"><input type="hidden" name="handle" value="${escapeHtml(
        consent.handle,
      )}">
      <label>Reuse an active assignment <select name="grant_id"><option value="">Create a new grant</option>${options}</select></label>
      <label>Agent name for a new grant <input name="agent_label" maxlength="100"></label>
      <button name="decision" value="approve">Allow</button><button name="decision" value="deny">Deny</button></form></html>`);
  }

  @Post('oauth/consent')
  @ApiOperation({ summary: 'Approve or deny a browser-bound MCP consent request' })
  async consent(@Body() body: unknown, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    this.secure(reply);
    const url = await this.oauth.consent(body, this.browser(req));
    const secure = this.oauth.config().issuer.startsWith('https:') ? '; Secure' : '';
    reply.header('Set-Cookie', `${this.cookieName()}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
    return reply.status(303).redirect(url);
  }

  @Get('oauth/grants')
  @ApiOperation({ summary: 'List active grants for the authenticated Focus Bear owner' })
  async grants(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.secure(reply);
    return this.oauth.listGrants(req.headers.authorization);
  }

  @Delete('oauth/grants/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Permanently revoke an owned MCP grant' })
  async revoke(@Param('id') id: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.secure(reply);
    await this.oauth.revokeGrant(req.headers.authorization, id);
  }

  @Post('oauth/token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a single-use authorization code and matching S256 verifier' })
  async token(@Body() body: unknown, @Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    this.secure(reply);
    if (req.headers.authorization) oauthError('invalid_client', 401);
    return this.oauth.token(body);
  }
}
