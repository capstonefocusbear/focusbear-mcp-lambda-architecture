import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectSentry, SentryService } from '@app/observability';
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
}
