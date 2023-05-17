import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { UpdateUserConsentDto } from '../../dto/update-user-consent.dto';
import { UserConsentRepository } from '../../repositories/user-consent.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserConsentTypes } from '../../domain/user-consent.enum';

@Injectable()
export class UserConsentService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userConsentRepository: UserConsentRepository,
  ) {}

  async upsertUserConsent(userConsent: UpdateUserConsentDto, user_id: string) {
    const user = await this.userRepository.orm.findOneBy({ id: user_id });
    if (!user) throw new NotFoundException(`User with id: ${user_id} does not exist!`);
    const { consent_type, consent_status } = userConsent;
    const existingConsentRecord = await this.userConsentRepository.orm.findOneBy({ consent_type, user_id });
    if (consent_type === UserConsentTypes.TERMS_OF_SERVICE) {
      await this.userRepository.orm.update({ id: user_id }, { has_consented_to_terms_of_service: !!consent_status });
    }
    if (existingConsentRecord) {
      // if user is revoking consent, update withdrawal date
      if (existingConsentRecord.consent_status && !userConsent.consent_status) {
        existingConsentRecord.withdrawal_date = DateTime.local({ zone: 'UTC' }).toJSDate();
      }
      await this.userConsentRepository.orm.save({ ...existingConsentRecord, ...userConsent });
      return;
    }
    await this.userConsentRepository.upsert({ ...userConsent, user_id }, ['id']);
  }
}
