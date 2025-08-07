import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../repositories/user.repository';
import { UpdateEmailPreferencesDto } from '../../dto/update-email-preferences.dto';
import { EmailPreferencesResponseDto } from '../../dto/email-preferences-response.dto';
import { UnsubscribeEmailDto } from '../../dto/unsubscribe-email.dto';
import { EmailFrequency, User } from '../../entities/user.entity';

@Injectable()
export class UserEmailPreferencesService {
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
    return await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Update email frequency if provided
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
        // Verify and extract userId from token
        const payload = this.jwtService.verify(dto.token);

        // Validate token purpose
        if (payload.purpose !== 'unsubscribe') {
          throw new BadRequestException('Invalid token purpose');
        }

        userId = payload.userId;
      } else if (dto.user_id) {
        // Direct unsubscribe with user_id (for authenticated requests)
        userId = dto.user_id;
      } else {
        throw new BadRequestException('Token or user_id required');
      }

      await this.userRepository.updateEmailFrequency(userId, EmailFrequency.UNSUBSCRIBED);

      // Log unsubscribe event with metrics
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

  private generateUnsubscribeToken(userId: string): string {
    return this.jwtService.sign({ userId, purpose: 'unsubscribe' }, { expiresIn: '30d' });
  }
}
