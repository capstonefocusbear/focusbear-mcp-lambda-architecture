import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  activityTemplateIdsDummy,
  deserializedActivitiesDummy,
  installedPackRecordDummy,
  routineHabitPackDBResponseDummy,
  routineHabitPackDummy,
  standaloneHabitPackDBResponseDummy,
  standaloneHabitPackDummy,
  userSettingsDummy,
} from '../../../../../test/dummies /habit-packs.dummies';
import { userDummy } from '../../../../../test/dummies ';
import { HabitPackService } from './habit-pack.service';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import {
  ActivityParserServiceMock,
  ActivitySequenceRepositoryMock,
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
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';

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
        ActivityParserService,
        ActivitySequenceRepository,
        HabitPackRepository,
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
      .overrideProvider(ActivityParserService)
      .useValue(ActivityParserServiceMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .compile();

    habitPackManagerService = moduleRef.get<HabitPackManagerService>(HabitPackManagerService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(habitPackManagerService).toBeDefined();
  });

  describe('installRoutineHabitPack', () => {
    it('Positive: should return a successfull response message', async () => {
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const response = await habitPackManagerService.installRoutineHabitPack(userDummy.id, routineHabitPackDummy.id);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.getSettings).toBeCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toBeCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toBeCalledWith(userDummy.id, routineHabitPackDummy.id);
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
    });
  });

  describe('uninstallRoutineHabitPack', () => {
    it('Positive: should return a successful uninstall message', async () => {
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      ActivityTemplateRepositoryMock.getActivityTemplateIds.mockResolvedValueOnce(activityTemplateIdsDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      const response = await habitPackManagerService.uninstallRoutineHabitPack(userDummy.id, routineHabitPackDummy.id);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully uninstalled for user with ID: ${userDummy.id}!`;
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

  describe('installHabitPack', () => {
    it('negative: should return that the user already has the pack installed', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(routineHabitPackDummy);
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

    it('negative: should return that habit pack does not exist', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Habit pack with ID: ${routineHabitPackDummy.id} does not exist!`;
      let exception: any;

      try {
        await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return that the routine pack was installed for user', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValue(routineHabitPackDummy);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      const response = await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.getSettings).toBeCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toBeCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toBeCalledWith(userDummy.id, routineHabitPackDummy.id);
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
    });

    it('positive: should return that the standalone pack was installed for user', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      HabitPackServiceMock.getHabitPack.mockResolvedValue(standaloneHabitPackDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValueOnce(deserializedActivitiesDummy);
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.installHabitPack(userDummy.id, standaloneHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toBeCalledWith(
        userDummy.id,
        standaloneHabitPackDummy.id,
        deserializedActivitiesDummy[0].sequence.id,
      );
      expect(HabitPackRepositoryMock.consistentlyInstallStandaloneHabitPack).toBeCalled();
    });
  });

  describe('uninstallHabitPack', () => {
    it('negative: should return that pack does not exist', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.uninstallHabitPack(userDummy.id, standaloneHabitPackDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('negative: should return response message that pack is already installed', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} doesn't have pack with ID: ${routineHabitPackDummy.id} installed!`;

      let response;
      try {
        response = await habitPackManagerService.uninstallHabitPack(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('positive: should return a successful uninstall response for routine habit pack', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      ActivityTemplateRepositoryMock.getActivityTemplateIds.mockResolvedValueOnce(activityTemplateIdsDummy);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully uninstalled for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.uninstallHabitPack(userDummy.id, routineHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.updateSettings).toBeCalled();
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toBeCalled();
    });

    it('positive: should return a successful uninstall response for standalone habit pack', async () => {
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValue(installedPackRecordDummy);
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDummy.id} successfully uninstalled for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.uninstallHabitPack(userDummy.id, standaloneHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(ActivitySequenceRepositoryMock.orm.delete).toBeCalledWith(installedPackRecordDummy.activity_sequence_id);
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toBeCalledWith(
        userDummy.id,
        standaloneHabitPackDummy.id,
      );
    });
  });
});
