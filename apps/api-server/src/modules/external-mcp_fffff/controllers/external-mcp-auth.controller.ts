import { Body, Patch } from '@nestjs/common';
import { McpConnectionsService } from '../services/mcp-connections.service';
import {
  RenameMcpConnectionDto,
  LinkMcpConnectionDto,
  ConfirmMcpRevocationDto,
} from '../dto/manage-mcp-connection.dto';
import { IsAdmin } from '../../auth/guards/is-admin/is-admin.guard';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  GoneException,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { ExternalMcpAuthService } from '../services/external-mcp-auth.service';
import { ExternalApiTokenResponseDto } from '../dto/external-api-token-response.dto';
import { McpAgentResponseDto } from '../dto/mcp-agent-response.dto';

@Controller('mcp/auth')
@ApiTags('mcp-auth')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class ExternalMcpAuthController {
  constructor(
    private readonly externalMcpAuthService: ExternalMcpAuthService,
    private readonly connections: McpConnectionsService,
  ) {}

  @Post('tokens')
  @ApiOperation({ summary: 'Legacy MCP token issuance has been retired; use OAuth authorization' })
  issueToken(): never {
    throw new GoneException('Connect through the configured Auth0 authorization server');
  }

  @Get('tokens')
  @ApiOperation({
    summary: 'List active MCP connections',
    description: 'Returns all active MCP tokens for this user. Raw tokens are never returned.',
  })
  async listTokens(@AuthContext() { user }: Passport): Promise<ExternalApiTokenResponseDto[]> {
    return this.externalMcpAuthService.listTokens(user.id);
  }

  @Delete('tokens/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an MCP access token',
    description: 'Immediately invalidates the specified token. The MCP client will no longer be able to access data.',
  })
  async revokeToken(@Param('id', ParseUUIDPipe) id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.externalMcpAuthService.revokeToken(user.id, id);
  }

  @Get('agents')
  @ApiOperation({
    summary: 'List MCP agents for the current user',
    description:
      'Returns legacy agents and durable Auth0 connections. Use assigned_mcp_agent_id for Auth0 connections; ' +
      'legacy token IDs remain valid via assigned_mcp_token_id until linked.',
  })
  async listAgents(@AuthContext() { user }: Passport): Promise<McpAgentResponseDto[]> {
    return this.externalMcpAuthService.listAgents(user.id);
  }
  @Delete('agents/:id')
  async disconnect(@AuthContext() { user }: Passport, @Param('id', ParseUUIDPipe) id: string) {
    return this.connections.disconnect(user.id, id);
  }

  @Post('agents/:id/reconnect')
  async reconnect(@AuthContext() { user }: Passport, @Param('id', ParseUUIDPipe) id: string) {
    return this.connections.reconnect(user.id, id);
  }

  @Patch('agents/:id')
  async rename(
    @AuthContext() { user }: Passport,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenameMcpConnectionDto,
  ) {
    return this.connections.rename(user.id, id, dto.display_name);
  }

  @Post('agents/:id/link')
  async link(
    @AuthContext() { user }: Passport,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkMcpConnectionDto,
  ) {
    return this.connections.link(user.id, dto.legacy_token_id, id);
  }

  @Get('revocations')
  @UseGuards(IsAdmin)
  async pendingRevocations() {
    return this.connections.pendingRevocations();
  }

  @Post('agents/:id/revocation-complete')
  @UseGuards(IsAdmin)
  async confirmRevocation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmMcpRevocationDto) {
    return this.connections.confirmRevocation(id, dto.revision, dto.evidence);
  }
}
