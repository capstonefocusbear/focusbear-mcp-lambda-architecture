import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { UpdateUserConsentDto } from '../../dto/update-user-consent.dto';
import { UserConsentRepository } from '../../repositories/user-consent.repository';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class UserConsentService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userConsentRepository: UserConsentRepository,
  ) {}

  async upsertUserConsent(userConsent: UpdateUserConsentDto, user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const existingConsentRecord = await this.userConsentRepository.orm.findOneBy({ id: userConsent.id });
    // if user is revoking consent, update withdrawal date
    if (existingConsentRecord && existingConsentRecord.consent_status && !userConsent.consent_status) {
      await this.userConsentRepository.orm.save({
        ...userConsent,
        withdrawal_date: DateTime.local({ zone: 'UTC' }).toISO(),
      });
      return;
    }
    await this.userConsentRepository.upsert({ ...userConsent, user_id }, ['id']);
  }
}
