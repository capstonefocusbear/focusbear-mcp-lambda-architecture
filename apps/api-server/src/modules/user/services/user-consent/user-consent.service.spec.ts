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

  beforeAll(async () => {
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

  describe('upsertUserConsents', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('negative: if user does not exist in DB, not found exception should be thrown', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      let exception: any;

      try {
        await service.upsertUserConsents(
          [{ consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true }],
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

    it('positive: creates records for non-existing consents and updates user flags for TOS and Privacy Policy', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      // two lookups for existing records (both return null)
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      await service.upsertUserConsents(
        [
          { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true },
          { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: true },
        ],
        userDummy.id,
      );

      // Upserts for both consents
      expect(UserConsentRepositoryMock.upsert).toHaveBeenCalledWith(
        { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true, user_id: userDummy.id },
        ['id'],
      );
      expect(UserConsentRepositoryMock.upsert).toHaveBeenCalledWith(
        { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: true, user_id: userDummy.id },
        ['id'],
      );

      // User flag updates for both consent types
      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
        { id: userDummy.id },
        expect.objectContaining({ has_consented_to_privacy_policy: true, updated_at: expect.any(String) }),
      );
      expect(UserRepositoryMock.orm.update).toHaveBeenCalledWith(
        { id: userDummy.id },
        expect.objectContaining({
          has_consented_to_terms_of_service: true,
          has_received_inactivity_warning: false,
          updated_at: expect.any(String),
        }),
      );
    });

    it('positive: if user withdraws privacy policy consent, withdrawal_date should be updated', async () => {
      Settings.now = () => new Date('2022-10-06T07:05:00.000Z').valueOf();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ consent_status: true });

      await service.upsertUserConsents(
        [{ consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: false }],
        userDummy.id,
      );

      expect(UserConsentRepositoryMock.orm.save).toHaveBeenCalledWith({
        consent_type: UserConsentTypes.PRIVACY_POLICY,
        consent_status: false,
        withdrawal_date: DateTime.local({ zone: 'UTC' }).toJSDate(),
      });
    });

    it('positive: existing record remains without withdrawal_date when consent stays true', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ consent_status: true });

      await service.upsertUserConsents(
        [{ consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true }],
        userDummy.id,
      );

      expect(UserConsentRepositoryMock.orm.save).toHaveBeenCalled();
      const arg = UserConsentRepositoryMock.orm.save.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          consent_type: UserConsentTypes.PRIVACY_POLICY,
          consent_status: true,
        }),
      );
      expect('withdrawal_date' in arg).toBe(false);
    });

    it('positive: continues processing other consents if one fails (Promise.allSettled)', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      // Two findOneBy calls for two consents, both non-existing
      UserConsentRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      // First upsert (privacy) fails, second (tos) succeeds
      UserConsentRepositoryMock.upsert.mockRejectedValueOnce(new Error('db error')).mockResolvedValueOnce(undefined);

      await expect(
        service.upsertUserConsents(
          [
            { consent_type: UserConsentTypes.PRIVACY_POLICY, consent_status: true },
            { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: true },
          ],
          userDummy.id,
        ),
      ).resolves.toBeUndefined();

      // Ensure second consent was still processed
      expect(UserConsentRepositoryMock.upsert).toHaveBeenCalledWith(
        { consent_type: UserConsentTypes.TERMS_OF_SERVICE, consent_status: true, user_id: userDummy.id },
        ['id'],
      );
    });
  });
});
