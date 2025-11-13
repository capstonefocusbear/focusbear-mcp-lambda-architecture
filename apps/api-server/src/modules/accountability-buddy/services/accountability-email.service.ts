import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendGridService } from '@app/send-grid';
import { EMAIL_TEMPLATE_IDS, FOCUS_BEAR_EMAILS } from '../../../shared/utils/constants';

@Injectable()
export class AccountabilityEmailService {
  constructor(private readonly emailService: SendGridService, private readonly configService: ConfigService) {}

  async sendBuddyInvitationEmail(buddyEmail: string, inviteUrl: string, userName?: string): Promise<void> {
    await this.emailService.sendEmail({
      to: buddyEmail,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      templateId: EMAIL_TEMPLATE_IDS.ACCOUNTABILITY_BUDDY_INVITATION,
      dynamicTemplateData: {
        invite_url: inviteUrl,
        user_name: userName || 'a Focus Bear user',
      },
      bcc: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
    });
  }

  async sendUnlockRequestEmail(
    buddyEmail: string,
    approvalUrl: string,
    userName: string,
    reason?: string,
  ): Promise<void> {
    await this.emailService.sendEmail({
      to: buddyEmail,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      templateId: EMAIL_TEMPLATE_IDS.UNLOCK_REQUEST_RECEIVED,
      dynamicTemplateData: {
        approval_url: approvalUrl,
        user_name: userName,
        reason: reason || '',
      },
      bcc: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
    });
  }

  async sendUnlockRequestApprovedEmail(userEmail: string): Promise<void> {
    await this.emailService.sendEmail({
      to: userEmail,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      templateId: EMAIL_TEMPLATE_IDS.UNLOCK_REQUEST_APPROVED,
      bcc: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
    });
  }

  getFrontendBaseUrl(origin?: string): string {
    const devFrontendUrl = this.configService.get<string>('server.devFrontendUrl');
    return devFrontendUrl === origin ? devFrontendUrl : this.configService.get<string>('server.frontEndUrl');
  }
}
