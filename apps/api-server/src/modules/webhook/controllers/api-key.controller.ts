import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { ApiKeyService } from '../services/api-key.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';
import { ApiKeyCreatedResponseDto } from '../dto/api-key-created-response.dto';

@Controller('webhook/api-keys')
@UseGuards(IsAuth)
@ApiTags('Webhook - API Keys')
@ApiSecurity('Auth0AccessToken')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key for Zapier/n8n integration' })
  @ApiResponse({ status: 201, description: 'API key created successfully', type: ApiKeyCreatedResponseDto })
  async createApiKey(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @AuthContext() { user }: Passport,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeyService.createApiKey(user.id, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for the current user' })
  @ApiResponse({ status: 200, description: 'List of API keys', type: [ApiKeyResponseDto] })
  async getApiKeys(@AuthContext() { user }: Passport): Promise<ApiKeyResponseDto[]> {
    return this.apiKeyService.getApiKeys(user.id);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Revoke an API key (deactivate without deleting)' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  async revokeApiKey(@Param('id') id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.apiKeyService.revokeApiKey(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an API key permanently' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  async deleteApiKey(@Param('id') id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.apiKeyService.deleteApiKey(user.id, id);
  }
}
