import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  activityTemplateIdsDummy,
  installedPackRecordDummy,
  routineHabitPackDummy,
  userSettingsDummy,
} from '../../../../../test/dummies /habit-packs.dummies';
import { userDummy } from '../../../../../test/dummies ';
import { HabitPackService } from './habit-pack.service';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import {
  ActivityTemplateRepositoryMock,
  HabitPackRepositoryMock,
  HabitPackServiceMock,
  InstalledPackRepositoryMock,
  InstalledPackServiceMock,
  UserSettingsServiceMock,
} from '../../../../../test/mocks';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { InstalledPackService } from '../installed-packs/installed-pack.service';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { HabitPackManagerService } from './habit-pack-manager.service';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';

describe('HabitPackManagerService', () => {
  let habitPackManagerService: HabitPackManagerService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitPackService,
        HabitPackRepository,
        ActivityTemplateRepository,
        InstalledPackService,
        InstalledPackRepository,
        UserSettingsService,
        HabitPackManagerService,
      ],
    })
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .overrideProvider(HabitPackService)
      .useValue(HabitPackServiceMock)
      .overrideProvider(ActivityTemplateRepository)
      .useValue(ActivityTemplateRepositoryMock)
      .overrideProvider(InstalledPackService)
      .useValue(InstalledPackServiceMock)
      .overrideProvider(InstalledPackRepository)
      .useValue(InstalledPackRepositoryMock)
      .overrideProvider(UserSettingsService)
      .useValue(UserSettingsServiceMock)
      .compile();

    habitPackManagerService = moduleRef.get<HabitPackManagerService>(HabitPackManagerService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(habitPackManagerService).toBeDefined();
  });

  describe('installHabitPack', () => {
    it('Negative: should return a bad request exception saying user already has pack installed', async () => {
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);

      const errorMessage = `User with ID: ${userDummy.id} already has habit pack with ID: ${routineHabitPackDummy.id} installed!`;
      let exception: any;
      try {
        await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should return a successfull response message', async () => {
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const response = await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} was successfully installed for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.getSettings).toBeCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toBeCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toBeCalledWith(userDummy.id, routineHabitPackDummy.id);
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
    });
  });

  describe('uninstallHabitPack', () => {
    it("Negative: should return a bad request exception saying user doesn't have pack installed", async () => {
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      const errorMessage = `User with ID: ${userDummy.id} does not have habit pack with ID: ${routineHabitPackDummy.id} installed!`;
      let exception: any;
      try {
        await habitPackManagerService.uninstallHabitPack(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(BadRequestException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should return a successful uninstall message', async () => {
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      ActivityTemplateRepositoryMock.getActivityTemplateIds.mockResolvedValueOnce(activityTemplateIdsDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      const response = await habitPackManagerService.uninstallHabitPack(userDummy.id, routineHabitPackDummy.id);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} was successfully uninstalled for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      expect(response.message).toMatch(responseMessage);
      expect(ActivityTemplateRepositoryMock.getActivityTemplateIds).toBeCalledWith(routineHabitPackDummy.id);
      expect(UserSettingsServiceMock.getSettings).toBeCalledWith({ user_id });
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toBeCalledWith(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
    });
  });

  describe('convertActivityTemplatesToUpdateActivityDtos', () => {
    it('Positive: should return an array of UpdateActivityDtos', () => {
      const result = habitPackManagerService.convertActivityTemplatesToUpdateActivityDtos(
        routineHabitPackDummy.evening_activities,
      );
      result[0].id = 'dynamic';

      expect(result[0]).toHaveProperty('activity_template_id');
      expect(result[0]).toMatchSnapshot();
    });
  });
});
