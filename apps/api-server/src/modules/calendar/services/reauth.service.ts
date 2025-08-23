import { Injectable, Logger } from '@nestjs/common';
import { PlatformIntegrationRepository } from '../../platform-integrations/repositories/platform-integration.repository';

@Injectable()
export class ReauthService {
  private readonly logger = new Logger(ReauthService.name);

  constructor(private readonly platformIntegrationRepository: PlatformIntegrationRepository) {}

  async markIntegrationForReauth(
    userId: string,
    account: string,
    reason: {
      reason: string;
      [key: string]: any;
    },
  ): Promise<void> {
    try {
      // Get the existing integration record
      const existingIntegration = await this.platformIntegrationRepository.orm.findOne({
        where: { user_id: userId, external_user_id: account },
      });

      if (existingIntegration) {
        // Mark integration data as requiring reauth
        const updatedData = {
          ...existingIntegration.data,
          requires_reauth: true,
          reauth_reason: reason,
          reauth_requested_at: new Date().toISOString(),
        };

        await this.platformIntegrationRepository.orm.update(
          { user_id: userId, external_user_id: account },
          { data: updatedData },
        );
      }

      // Log the reauth requirement for monitoring
      this.logReauthRequirement(userId, reason);
    } catch (error) {
      this.logger.error('Failed to mark integration for reauth:', error);
      // Don't throw - this shouldn't prevent the main error from being processed
    }
  }

  // TODO: Implement proper notification system integration
  // For now just log the reauth requirement
  private logReauthRequirement(userId: string, reason: { reason: string; [key: string]: any }): void {
    const message = this.getReauthMessage(reason.reason);
    this.logger.warn(`Reauth required for user ${userId}: ${message}`, reason);
  }

  private getReauthMessage(reasonType: string): string {
    switch (reasonType) {
      case 'invalid_refresh_token':
        return 'Your Google Calendar connection has expired and needs to be renewed. Please reconnect your account in settings.';
      case 'insufficient_permissions':
        return 'Your Google Calendar permissions have changed. Please reconnect your account to restore calendar sync.';
      case 'authentication_failed':
        return 'There was an authentication issue with your Google Calendar. Please reconnect your account.';
      case 'missing_scopes':
        return 'Additional permissions are required for Google Calendar sync. Please reconnect your account.';
      default:
        return 'There was an issue with your Google Calendar connection. Please reconnect your account in settings.';
    }
  }
}
