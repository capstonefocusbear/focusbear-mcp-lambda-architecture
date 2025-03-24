import { Test } from '@nestjs/testing';
import { DateTime } from 'luxon';
import { GoogleAuthServiceMock, PlatformIntegrationsRepositoryMock } from '../../../../test/mocks/index';
import { PlatformIntegrationsService } from './platform-integrations.service';
import { PlatformIntegrationRepository } from '../repositories/platform-integration.repository';
import { IntegrationPlatforms } from '../domain/integration-platforms.enum';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegration } from '../entities/platform-integration.entity';
import { GoogleAuthService } from '../../auth/services/google-auth.service';

describe('PlatformIntegrationsService', () => {
  let platformIntegrationsService: PlatformIntegrationsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PlatformIntegrationsService, PlatformIntegrationRepository, GoogleAuthService],
    })
      .overrideProvider(PlatformIntegrationRepository)
      .useValue(PlatformIntegrationsRepositoryMock)
      .overrideProvider(GoogleAuthService)
      .useValue(GoogleAuthServiceMock)
      .compile();

    platformIntegrationsService = moduleRef.get<PlatformIntegrationsService>(PlatformIntegrationsService);
  });

  it('should be defined', () => {
    expect(platformIntegrationsService).toBeDefined();
  });

  describe('getPlatformIntegrationData', () => {
    it('positive: should query the DB for a matching record', async () => {
      PlatformIntegrationsRepositoryMock.orm.findOne.mockResolvedValueOnce(
        new PlatformIntegration({ user_id: userDummy.id, platform: IntegrationPlatforms.ZOHO, data: {} }),
      );
      const platformData = await platformIntegrationsService.getPlatformIntegrationData(
        IntegrationPlatforms.ZOHO,
        userDummy.id,
      );

      expect(PlatformIntegrationsRepositoryMock.orm.findOne).toBeCalledWith({
        where: { platform: IntegrationPlatforms.ZOHO, user_id: userDummy.id },
      });

      expect(platformData).toBeInstanceOf(PlatformIntegration);
    });
  });

  describe('updatePlatformIntegration', () => {
    const dummyZohoData = {
      access_token: 'some-text',
      refresh_token: 'some-more-text',
      accountId: 'dummy-id',
    };

    it('positive: if no existing record is found, a new one should be created', async () => {
      PlatformIntegrationsRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await platformIntegrationsService.updatePlatformIntegration(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        dummyZohoData,
        dummyZohoData.accountId,
      );

      expect(PlatformIntegrationsRepositoryMock.orm.save).toBeCalledWith(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.accountId,
          data: dummyZohoData,
        }),
      );
    });

    it('positive: if existing integration is found for same user and platform, it should be updated', async () => {
      const updatedZohoDataDummy = { ...dummyZohoData, access_token: 'updated-token' };
      PlatformIntegrationsRepositoryMock.orm.findOne.mockResolvedValueOnce(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.accountId,
          data: dummyZohoData,
        }),
      );

      await platformIntegrationsService.updatePlatformIntegration(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        updatedZohoDataDummy,
        dummyZohoData.accountId,
      );

      expect(PlatformIntegrationsRepositoryMock.orm.update).toHaveBeenCalledWith(
        { user_id: userDummy.id, platform: IntegrationPlatforms.ZOHO, external_user_id: dummyZohoData.accountId },
        { data: updatedZohoDataDummy },
      );
    });
  });

  describe('getUserSyncedPlatforms', () => {
    it('positive: should return an array of all platforms user has synced with', async () => {
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([
        { platform: 'zoho' },
        { platform: 'zoho' },
        { platform: 'jira' },
      ]);

      const response = await platformIntegrationsService.getUserSyncedPlatforms(userDummy.id);

      expect(response).toEqual({
        zoho: true,
        jira: true,
        clickup: false,
        trello: false,
        asana: false,
        monday: false,
        google: false,
        microsoft: false,
      });
    });
  });

  describe('getPlatformAccounts', () => {
    it('positive: should return an array of all calendar accounts user has connected', async () => {
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          external_user_id: 'firstgmail@gmail.com',
          platform: 'google',
          data: {
            expiry_date: '1700903125447',
          },
        },
        {
          external_user_id: 'secondgmail@gmail.com',
          platform: 'google',
          data: {
            expiry_date: '1700903125448',
          },
        },
      ]);

      const response = await platformIntegrationsService.getPlatformAccounts(IntegrationPlatforms.GOOGLE, userDummy.id);

      expect(response).toEqual([
        { email: 'firstgmail@gmail.com', expired: true },
        { email: 'secondgmail@gmail.com', expired: true },
      ]);
    });

    it('positive: should attempt to refresh expired token for Google accounts', async () => {
      const dummyExternalId = 'expired@gmail.com';
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          external_user_id: dummyExternalId,
          platform: IntegrationPlatforms.GOOGLE,
          data: {
            expiry_date: DateTime.local().minus({ minutes: 10 }).toMillis(), // Expired token
            refresh_token: 'valid-refresh-token',
          },
        },
      ]);

      GoogleAuthServiceMock.refreshToken.mockResolvedValueOnce('new-access-token');

      const response = await platformIntegrationsService.getPlatformAccounts(IntegrationPlatforms.GOOGLE, userDummy.id);

      expect(GoogleAuthServiceMock.refreshToken).toHaveBeenCalledWith(userDummy.id, dummyExternalId);

      expect(response).toEqual([
        { email: dummyExternalId, expired: false }, // Token should be refreshed
      ]);
    });

    it('negative: should mark account as expired if token refresh fails', async () => {
      const dummyExternalId = 'expired@gmail.com';
      // Mock expired token scenario
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          external_user_id: dummyExternalId,
          platform: IntegrationPlatforms.GOOGLE,
          data: {
            expiry_date: DateTime.local().minus({ minutes: 10 }).toMillis(), // Expired token
            refresh_token: 'valid-refresh-token',
          },
        },
      ]);

      GoogleAuthServiceMock.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));

      const response = await platformIntegrationsService.getPlatformAccounts(IntegrationPlatforms.GOOGLE, userDummy.id);

      expect(GoogleAuthServiceMock.refreshToken).toHaveBeenCalledWith(userDummy.id, dummyExternalId);

      expect(response).toEqual([
        { email: dummyExternalId, expired: true }, // Token remains expired
      ]);
    });
  });

  describe('getAssigneeStatus', () => {
    it('positive: should return an array of integration only_assigned values', async () => {
      PlatformIntegrationsRepositoryMock.orm.find.mockResolvedValueOnce([
        {
          platform: 'asana',
          only_assigned: true,
        },
        {
          platform: 'clickup',
          only_assigned: true,
        },
        {
          platform: 'trello',
          only_assigned: false,
        },
      ]);

      const response = await platformIntegrationsService.getAssigneeStatus(userDummy.id);

      expect(response).toEqual([
        {
          platform: 'zoho',
          status: '1',
        },
        {
          platform: 'clickup',
          status: '1',
        },
        {
          platform: 'trello',
          status: '2',
        },
        {
          platform: 'jira',
          status: '1',
        },
        {
          platform: 'asana',
          status: '1',
        },
        {
          platform: 'monday',
          status: '1',
        },
      ]);
    });
  });
});
