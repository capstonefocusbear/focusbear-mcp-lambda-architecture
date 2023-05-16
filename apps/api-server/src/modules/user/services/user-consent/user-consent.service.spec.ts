import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { DateTime, Settings } from 'luxon';
import { userDummy } from '../../../../../test/dummies';
import { UserConsentRepositoryMock, UserRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { UserConsentTypes } from '../../domain/user-consent.enum';
import { UserConsentRepository } from '../../repositories/user-consent.repository';
import { UserRepository } from '../../repositories/user.repository';
import { UserConsentService } from './user-consent.service';

describe('UserConsentService', () => {
  let service: UserConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserConsentService,
        UserConsentRepository,
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(UserConsentRepository)
      .useValue(UserConsentRepositoryMock)
      .compile();

    service = module.get<UserConsentService>(UserConsentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertUserConsent', () => {
    it('negative: if user does not exist in DB, not found exception should be thrown', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await service.upsertUserConsent(
          { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: false },
          userDummy.id,
        );
      } catch (error) {
        exception = error;
      }

      const errorMessage = `User with id: ${userDummy.id} does not exist!`;
      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if user consents to privacy policy, record should be created in user_consent table with true value for consent_status and it should include policy version', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      await service.upsertUserConsent(
        { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true },
        userDummy.id,
      );

      expect(UserConsentRepositoryMock.upsert).toBeCalledWith(
        { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true, user_id: userDummy.id },
        ['id'],
      );
    });

    it('positive: if user withdraws consent, withdrawal_date field should be updated with date', async () => {
      Settings.now = () => new Date('2022-10-06T07:05:00.000Z').valueOf();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ consent_status: true });

      await service.upsertUserConsent(
        { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: false },
        userDummy.id,
      );

      expect(UserConsentRepositoryMock.orm.save).toBeCalledWith({
        consent_type: UserConsentTypes.PRIVACY_POLICY,
        consent_status: false,
        withdrawal_date: DateTime.local({ zone: 'UTC' }).toJSDate(),
      });
    });

    it('positive: if user consents to terms of service, user has_consented_to_terms_of_service should be set to true', async () => {
      Settings.now = () => new Date('2022-10-06T07:05:00.000Z').valueOf();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ consent_status: true });

      await service.upsertUserConsent(
        { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: true },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        { id: userDummy.id },
        { has_consented_to_terms_of_service: true },
      );
    });

    it('positive: if user withdraws consent to terms of service, user has_consented_to_terms_of_service should be set to false', async () => {
      Settings.now = () => new Date('2022-10-06T07:05:00.000Z').valueOf();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ consent_status: true });

      await service.upsertUserConsent(
        { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: false },
        userDummy.id,
      );

      expect(UserRepositoryMock.orm.update).toBeCalledWith(
        { id: userDummy.id },
        { has_consented_to_terms_of_service: false },
      );
    });
  });
});
