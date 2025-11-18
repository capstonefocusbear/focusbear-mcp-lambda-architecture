import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { installedPackRecordDummy, routineHabitPackDummy } from '../../../../../test/dummies/habit-packs.dummies';
import { userDummy } from '../../../../../test/dummies';
import { InstalledPackRepositoryMock, SentryServiceMock } from '../../../../../test/mocks';
import { InstalledPackService } from './installed-pack.service';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';
import { InstalledPack } from '../../entity/installed-pack.entity';

describe('HabitPackManagerService', () => {
  let installedPackService: InstalledPackService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        InstalledPackRepository,
        InstalledPackService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })

      .overrideProvider(InstalledPackRepository)
      .useValue(InstalledPackRepositoryMock)
      .compile();

    installedPackService = moduleRef.get<InstalledPackService>(InstalledPackService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(installedPackService).toBeDefined();
  });

  describe('setPackAsInstalledForUser', () => {
    it('Positive: should call update on installedPackRepository', async () => {
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      await installedPackService.setPackAsInstalledForUser(userDummy.id, routineHabitPackDummy.id);

      expect(InstalledPackRepositoryMock.update).toHaveBeenCalledWith(
        installedPackRecordDummy.id,
        installedPackRecordDummy,
      );
    });

    it('Positive: should call create on installedPackRepository', async () => {
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const newRecord: InstalledPack = {
        user_id: userDummy.id,
        pack_id: routineHabitPackDummy.id,
        installation_status: true,
        activity_sequence_id: null,
      };
      await installedPackService.setPackAsInstalledForUser(userDummy.id, routineHabitPackDummy.id);

      expect(InstalledPackRepositoryMock.create).toHaveBeenCalledWith(newRecord);
    });
  });

  describe('setPackAsUninnstalledForUser', () => {
    it('Positive: should call update on installedPackRepository', async () => {
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      expect(installedPackRecordDummy.installation_status).toBe(true);
      await installedPackService.setPackAsUninstalledForUser(userDummy.id, routineHabitPackDummy.id);

      expect(InstalledPackRepositoryMock.update).toHaveBeenCalledWith(
        installedPackRecordDummy.id,
        installedPackRecordDummy,
      );
      expect(installedPackRecordDummy.installation_status).toBe(false);
    });
  });
});
