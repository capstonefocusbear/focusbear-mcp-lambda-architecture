import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { ExternalMcpAuthService } from '../services/external-mcp-auth.service';
import { CreateExternalApiTokenDto } from '../dto/create-external-api-token.dto';
import { ExternalApiTokenIssuedResponseDto, ExternalApiTokenResponseDto } from '../dto/external-api-token-response.dto';
import { McpAgentResponseDto } from '../dto/mcp-agent-response.dto';
// import { Response } from 'express'; //
import { FastifyReply } from 'fastify';

@Controller('mcp/auth')
@ApiTags('mcp-auth')
// @UseGuards(IsAuth)
// @ApiSecurity('Auth0AccessToken')
export class ExternalMcpAuthController {
  constructor(private readonly externalMcpAuthService: ExternalMcpAuthService) {}

  /*
  @Post('tokens')
  @ApiOperation({
    summary: 'Issue a new MCP access token',
    description:
      'Generates a scoped access token for an MCP client to access this Focus Bear account. ' +
      'The raw token is returned ONCE and cannot be retrieved again — store it securely in your MCP client settings.',
  })
  async issueToken(@Body() dto: CreateExternalApiTokenDto): Promise<ExternalApiTokenIssuedResponseDto> {
    const fakeUserId = '2636a216-f363-493e-aeb8-d275a0a9016d';
    return this.externalMcpAuthService.issueToken(fakeUserId, dto);
  }*/

  @Post('tokens')
  @ApiOperation({
    summary: 'Issue a new MCP access token',
    description: 'Generates a token. Use ?redirect=true for mobile deep linking, or omit it to get raw JSON.',
  })
  async issueToken(
    @Body() dto: CreateExternalApiTokenDto,
    @Query('redirect') redirect: string,
    @Res() res: FastifyReply, // <-- 1. Use FastifyReply instead of Express Response
  ) {
    const fakeUserId = '2636a216-f363-493e-aeb8-d275a0a9016d';

    // Generate the token
    const tokenData = await this.externalMcpAuthService.issueToken(fakeUserId, dto);

    if (redirect === 'true') {
      const deepLinkUrl = `focusbear://auth?token=${tokenData.token}`;
      // 2. Fastify syntax: chain .status() before .redirect()
      return res.status(HttpStatus.FOUND).redirect(deepLinkUrl);
    }

    // 3. Fastify syntax: use .send() instead of .json()
    return res.status(HttpStatus.CREATED).send(tokenData);
  }

  @Get('test-redirect')
  async testRedirect(@Res({ passthrough: true }) res: FastifyReply) {
    return res.status(302).redirect('focusbear://auth?token=dummy-test-token-123');
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
      'Returns all MCP tokens that have an agent_name set. Use the token id as assigned_mcp_token_id ' +
      'when assigning tasks to an AI agent via the tasks API.',
  })
  async listAgents(@AuthContext() { user }: Passport): Promise<McpAgentResponseDto[]> {
    return this.externalMcpAuthService.listAgents(user.id);
  }
}
