import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsAuth } from '../../auth/guards/is-auth/is-auth.guard';
import { AuthContext } from '../../../shared/decorators/passport.decorator';
import { Passport } from '../../auth/domain/passport.model';
import { WebhookSubscriptionService } from '../services/webhook-subscription.service';
import { CreateWebhookSubscriptionDto } from '../dto/create-webhook-subscription.dto';
import { UpdateWebhookSubscriptionDto } from '../dto/update-webhook-subscription.dto';
import { WebhookSubscriptionResponseDto } from '../dto/webhook-subscription-response.dto';

@Controller('webhooks/subscriptions')
@UseGuards(IsAuth)
@ApiTags('Webhook - Subscriptions')
@ApiSecurity('Auth0AccessToken')
export class WebhookSubscriptionController {
  constructor(private readonly webhookSubscriptionService: WebhookSubscriptionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new webhook subscription' })
  @ApiResponse({
    status: 201,
    description: 'Webhook subscription created successfully',
    type: WebhookSubscriptionResponseDto,
  })
  async createSubscription(
    @Body() createDto: CreateWebhookSubscriptionDto,
    @AuthContext() { user }: Passport,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookSubscriptionService.createSubscription(user.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions for the current user' })
  @ApiResponse({ status: 200, description: 'List of webhook subscriptions', type: [WebhookSubscriptionResponseDto] })
  async getSubscriptions(@AuthContext() { user }: Passport): Promise<WebhookSubscriptionResponseDto[]> {
    return this.webhookSubscriptionService.getSubscriptions(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific webhook subscription' })
  @ApiResponse({ status: 200, description: 'Webhook subscription details', type: WebhookSubscriptionResponseDto })
  async getSubscription(
    @Param('id') id: string,
    @AuthContext() { user }: Passport,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookSubscriptionService.getSubscription(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook subscription' })
  @ApiResponse({
    status: 200,
    description: 'Webhook subscription updated successfully',
    type: WebhookSubscriptionResponseDto,
  })
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateDto: UpdateWebhookSubscriptionDto,
    @AuthContext() { user }: Passport,
  ): Promise<WebhookSubscriptionResponseDto> {
    return this.webhookSubscriptionService.updateSubscription(user.id, id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  @ApiResponse({ status: 200, description: 'Webhook subscription deleted successfully' })
  async deleteSubscription(@Param('id') id: string, @AuthContext() { user }: Passport): Promise<void> {
    return this.webhookSubscriptionService.deleteSubscription(user.id, id);
  }
}
