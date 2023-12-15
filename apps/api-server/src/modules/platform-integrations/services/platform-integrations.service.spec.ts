import { Test } from '@nestjs/testing';
import { PlatformIntegrationsRepositoryMock } from '../../../../test/mocks/index';
import { PlatformIntegrationsService } from './platform-integrations.service';
import { PlatformIntegrationRepository } from '../repositories/platform-integration.repository';
import { IntegrationPlatforms } from '../domain/integration-platforms.enum';
import { userDummy } from '../../../../test/dummies';
import { PlatformIntegration } from '../entities/platform-integration.entity';

describe('PlatformIntegrationsService', () => {
  let platformIntegrationsService: PlatformIntegrationsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PlatformIntegrationsService, PlatformIntegrationRepository],
    })
      .overrideProvider(PlatformIntegrationRepository)
      .useValue(PlatformIntegrationsRepositoryMock)
      .compile();

    platformIntegrationsService = moduleRef.get<PlatformIntegrationsService>(PlatformIntegrationsService);
  });

  it('should be defined', () => {
    expect(platformIntegrationsService).toBeDefined();
  });

  describe('getPlatformIntegrationData', () => {
    it('positive: should query the DB for a matching record', async () => {
      await platformIntegrationsService.getPlatformIntegrationData(IntegrationPlatforms.ZOHO, userDummy.id);

      expect(PlatformIntegrationsRepositoryMock.orm.findOne).toBeCalledWith({
        where: { platform: IntegrationPlatforms.ZOHO, user_id: userDummy.id },
      });
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

      expect(PlatformIntegrationsRepositoryMock.orm.save).toBeCalledWith(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.accountId,
          data: updatedZohoDataDummy,
        }),
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
  });
});
