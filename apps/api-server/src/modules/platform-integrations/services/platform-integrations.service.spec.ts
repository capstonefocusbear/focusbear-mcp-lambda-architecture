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
      zoho_access_token: 'some-text',
      zoho_refresh_token: 'some-more-text',
      zoho_user_id: 'dummy-id',
    };

    it('positive: if no existing record is found, a new one should be created', async () => {
      PlatformIntegrationsRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await platformIntegrationsService.updatePlatformIntegration(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        dummyZohoData,
        dummyZohoData.zoho_user_id,
      );

      expect(PlatformIntegrationsRepositoryMock.orm.save).toBeCalledWith(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.zoho_user_id,
          data: dummyZohoData,
        }),
      );
    });

    it('positive: if existing integration is found for same user and platform, it should be updated', async () => {
      const updatedZohoDataDummy = { ...dummyZohoData, zoho_access_token: 'updated-token' };
      PlatformIntegrationsRepositoryMock.orm.findOne.mockResolvedValueOnce(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.zoho_user_id,
          data: dummyZohoData,
        }),
      );

      await platformIntegrationsService.updatePlatformIntegration(
        userDummy.id,
        IntegrationPlatforms.ZOHO,
        updatedZohoDataDummy,
        dummyZohoData.zoho_user_id,
      );

      expect(PlatformIntegrationsRepositoryMock.orm.save).toBeCalledWith(
        new PlatformIntegration({
          user_id: userDummy.id,
          platform: IntegrationPlatforms.ZOHO,
          external_user_id: dummyZohoData.zoho_user_id,
          data: updatedZohoDataDummy,
        }),
      );
    });
  });
});
