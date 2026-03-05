import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { OpenclawMcpAuthService } from '../services/openclaw-mcp-auth.service';
import { CreateOpenclawTokenDto } from '../dto/create-openclaw-token.dto';
import { OpenclawTokenIssuedResponseDto, OpenclawTokenResponseDto } from '../dto/openclaw-token-response.dto';

@Controller('openclaw-mcp/auth')
@ApiTags('openclaw-mcp-auth')
@UseGuards(IsAuth)
@ApiSecurity('Auth0AccessToken')
export class OpenclawMcpAuthController {
  constructor(private readonly openclawMcpAuthService: OpenclawMcpAuthService) {}

  @Post('tokens')
  @ApiOperation({
    summary: 'Issue a new OpenClaw access token',
    description:
      'Generates a scoped access token for OpenClaw to access this Focus Bear account. ' +
      'The raw token is returned ONCE and cannot be retrieved again — store it in OpenClaw settings.',
  })
  async issueToken(
    @AuthContext() { user }: Passport,
    @Body() dto: CreateOpenclawTokenDto,
  ): Promise<OpenclawTokenIssuedResponseDto> {
    return this.openclawMcpAuthService.issueToken(user.id, dto);
  }

  @Get('tokens')
  @ApiOperation({
    summary: 'List active OpenClaw connections',
    description: 'Returns all active OpenClaw tokens for this user. Raw tokens are never returned.',
  })
  async listTokens(@AuthContext() { user }: Passport): Promise<OpenclawTokenResponseDto[]> {
    return this.openclawMcpAuthService.listTokens(user.id);
  }

  @Delete('tokens/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke an OpenClaw access token',
    description: 'Immediately invalidates the specified token. OpenClaw will no longer be able to access data.',
  })
  async revokeToken(@Param('id') id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.openclawMcpAuthService.revokeToken(user.id, id);
  }
}
