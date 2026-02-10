import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectSentry, SentryService } from '@app/observability';
import { SendGridService } from '@app/send-grid';
import { Auth0ManagementService } from '@app/auth0';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../repositories/user.repository';
import { UpdateEmailPreferencesDto } from '../../dto/update-email-preferences.dto';
import { EmailPreferencesResponseDto } from '../../dto/email-preferences-response.dto';
import { UnsubscribeEmailDto } from '../../dto/unsubscribe-email.dto';
import { EmailFrequency, User } from '../../entities/user.entity';

@Injectable()
export class UserEmailPreferencesService {
  private readonly logger = new Logger(UserEmailPreferencesService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly sendGridService: SendGridService,
    private readonly auth0ManagementService: Auth0ManagementService,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async getEmailPreferences(userId: string): Promise<EmailPreferencesResponseDto> {
    const user = await this.userRepository.orm.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const unsubscribeToken = this.generateUnsubscribeToken(userId);

    return {
      email_frequency: user.email_frequency || EmailFrequency.WEEKLY,
      last_email_sent: user.metadata?.last_email_sent || null,
      unsubscribe_token: unsubscribeToken,
    };
  }

  async updateEmailPreferences(userId: string, dto: UpdateEmailPreferencesDto): Promise<EmailPreferencesResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (dto.email_frequency) {
        await this.userRepository.updateEmailFrequency(userId, dto.email_frequency);
      }

      return this.getEmailPreferences(userId);
    });
  }

  async unsubscribeFromEmails(dto: UnsubscribeEmailDto): Promise<void> {
    try {
      let userId: string;

      if (dto.token) {
        const payload = this.jwtService.verify(dto.token);

        if (payload.purpose !== 'unsubscribe') {
          throw new BadRequestException('Invalid token purpose');
        }

        userId = payload.userId;
      } else if (dto.user_id) {
        userId = dto.user_id;
      } else {
        throw new BadRequestException('Token or user_id required');
      }

      await this.userRepository.updateEmailFrequency(userId, EmailFrequency.UNSUBSCRIBED);

      if (dto.reason) {
        this.sentryService.instance().captureMessage('User unsubscribed from emails', {
          level: 'info',
          extra: { userId, reason: dto.reason },
          tags: { email_action: 'unsubscribe' },
        });
      }
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired unsubscribe token');
      }
      this.sentryService.instance().captureException(error);
      throw error;
    }
  }

  async getEmailPreferencesWithToken(token: string): Promise<EmailPreferencesResponseDto> {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'unsubscribe') {
        this.logger.error(`Invalid token purpose: ${payload.purpose}, expected: unsubscribe`);
        throw new BadRequestException('Invalid token purpose');
      }
      const preferences = await this.getEmailPreferences(payload.userId);

      return preferences;
    } catch (error) {
      this.logger.error('Failed to get email preferences with token:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        tokenPresent: !!token,
        timestamp: new Date().toISOString(),
      });

      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired token');
      }
      throw error;
    }
  }

  async updateEmailPreferencesWithToken(token: string, emailFrequency: EmailFrequency): Promise<void> {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'unsubscribe') {
        throw new BadRequestException('Invalid token purpose');
      }

      await this.userRepository.updateEmailFrequency(payload.userId, emailFrequency as any);

      this.sentryService.instance().captureMessage('User updated email preferences via token', {
        level: 'info',
        extra: { userId: payload.userId, newFrequency: emailFrequency },
        tags: { email_action: 'update_preferences' },
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invalid or expired token');
      }
      this.sentryService.instance().captureException(error);
      throw error;
    }
  }

  generateUnsubscribeToken(userId: string): string {
    return this.jwtService.sign({ userId, purpose: 'unsubscribe' }, { expiresIn: '30d' });
  }

  async sendEmailPreferencesLink(email: string): Promise<void> {
    try {
      // Look up user in Auth0 (cached, encrypted)
      const [auth0User] = await this.auth0ManagementService.getAuth0UsersWithEmail(email);
      if (!auth0User) {
        // Anti-enumeration: silently return without revealing if email exists
        this.logger.log(`Email preferences link requested for non-existent email: ${email.substring(0, 3)}***`);
        return;
      }

      // Find local user by auth0_id
      const user = await this.userRepository.orm.findOne({
        where: { auth0_id: auth0User.user_id },
      });

      if (!user) {
        // Auth0 user exists but no local user record - log for investigation
        this.logger.warn('Auth0 user found but no local user record', {
          auth0_id: auth0User.user_id,
          email_substring: email.substring(0, 3),
        });
        return;
      }

      const token = this.generateUnsubscribeToken(user.id);
      const apiUrl = process.env.API_URL || 'https://api.focusbear.io';
      const preferencesLink = `${apiUrl}/user/email-preferences/manage?token=${token}`;

      await this.sendGridService.sendEmail({
        to: email,
        from: 'support@focusbear.io',
        replyTo: 'support@focusbear.io',
        subject: 'Manage Your Focus Bear Email Preferences',
        html: this.generatePreferencesEmailHtml(preferencesLink),
        text: this.generatePreferencesEmailText(preferencesLink),
      });

      this.sentryService.instance().captureMessage('Email preferences link sent', {
        level: 'info',
        extra: { userId: user.id },
        tags: { email_action: 'preferences_link_sent' },
      });
    } catch (error) {
      this.logger.error('Failed to send email preferences link:', {
        error: error.message,
        stack: error.stack,
        email_substring: email.substring(0, 3),
      });
      this.sentryService.instance().captureException(error, {
        tags: { email_action: 'preferences_link_failed' },
        extra: {
          email_substring: email.substring(0, 3),
          error_name: error.name,
        },
      });
    }
  }

  private generatePreferencesEmailHtml(preferencesLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .logo { color: #FF6B35; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            background: #FF6B35; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Focus Bear</div>
          <h2>Manage Your Email Preferences</h2>
          <p>You requested a link to manage your Focus Bear email preferences.</p>
          <p>Click the button below to update how often you receive emails from us:</p>
          <a href="${preferencesLink}" class="button">Manage Email Preferences</a>
          <p>This link will expire in 30 days.</p>
          <p>If you didn't request this link, you can safely ignore this email.</p>
          <div class="footer">
            <p>Focus Bear - Build better habits, one day at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePreferencesEmailText(preferencesLink: string): string {
    return `
Focus Bear - Manage Your Email Preferences

You requested a link to manage your Focus Bear email preferences.

Click the link below to update how often you receive emails from us:
${preferencesLink}

This link will expire in 30 days.

If you didn't request this link, you can safely ignore this email.

---
Focus Bear - Build better habits, one day at a time.
    `.trim();
  }
}
