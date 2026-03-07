import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@app/observability';
import {
  activityTemplateIdsDummy,
  deserializedActivitiesDummy,
  installedPackRecordDummy,
  routineHabitPackDBResponseDummy,
  routineHabitPackDummy,
  standaloneHabitPackDBResponseDummy,
  standaloneHabitPackDummy,
  userSettingsDummy,
} from '../../../../../test/dummies/habit-packs.dummies';
import { ActivitySequenceDummy, userDummy } from '../../../../../test/dummies';
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
  SentryServiceMock,
  UserRepositoryMock,
  UserSettingsServiceMock,
} from '../../../../../test/mocks';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { InstalledPackService } from '../installed-packs/installed-pack.service';
import { UserSettingsService } from '../../../user/services/user-settings/user-settings.service';
import { HabitPackManagerService } from './habit-pack-manager.service';
import { InstalledPackRepository } from '../../repositories/installed-pack.repository';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';
import { UserRepository } from '../../../user/repositories/user.repository';

describe('HabitPackManagerService', () => {
  let habitPackManagerService: HabitPackManagerService;

  beforeAll(async () => {
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
        UserRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
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
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
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
    it('Positive: should return a successful response message', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const response = await habitPackManagerService.installRoutineHabitPack(userDummy.id, routineHabitPackDummy.id);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.getSettings).toHaveBeenCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toHaveBeenCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
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
      expect(ActivityTemplateRepositoryMock.getActivityTemplateIds).toHaveBeenCalledWith(routineHabitPackDummy.id);
      expect(UserSettingsServiceMock.getSettings).toHaveBeenCalledWith({ user_id });
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
    });
  });

  describe('convertActivityTemplatesToUpdateActivityDtos', () => {
    it('Positive: should return an array of UpdateActivityDtos', () => {
      const templatesNewIdsMap = new Map<string, string>([]);
      const templatesChoicesNewIdsMap = new Map<string, string>([]);
      const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
      const result = habitPackManagerService.convertActivityTemplatesToUpdateActivityDtos(
        routineHabitPackDummy.evening_activities,
        { templatesNewIdsMap, templatesChoicesNewIdsMap, logQuantityQuestionsNewIdsMap },
      );
      result[0].id = 'dynamic';

      expect(result[0]).toHaveProperty('activity_template_id');
    });
  });

  describe('installHabitPack', () => {
    it('negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;
      try {
        await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('negative: should return that the user already has the pack installed', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDummy);
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValue(routineHabitPackDummy);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;
      const user_id = userDummy.id;

      const response = await habitPackManagerService.installHabitPack(userDummy.id, routineHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.getSettings).toHaveBeenCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toHaveBeenCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
    });

    it('positive: should return that the standalone pack was installed for user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      HabitPackServiceMock.getHabitPack.mockResolvedValue(standaloneHabitPackDummy);
      ActivityParserServiceMock.deserialize.mockResolvedValueOnce(deserializedActivitiesDummy);
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDummy.id} successfully installed for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.installHabitPack(userDummy.id, standaloneHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        standaloneHabitPackDummy.id,
        deserializedActivitiesDummy[0].sequence.id,
      );
      expect(HabitPackRepositoryMock.consistentlyInstallStandaloneHabitPack).toHaveBeenCalled();
    });
  });

  describe('uninstallHabitPack', () => {
    it('negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.uninstallHabitPack(userDummy.id, standaloneHabitPackDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('negative: should return that pack does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
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
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(installedPackRecordDummy);
      ActivityTemplateRepositoryMock.getActivityTemplateIds.mockResolvedValueOnce(activityTemplateIdsDummy);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} successfully uninstalled for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.uninstallHabitPack(userDummy.id, routineHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toHaveBeenCalled();
    });

    it('positive: should return a successful uninstall response for standalone habit pack', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValue(installedPackRecordDummy);
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDummy.id} successfully uninstalled for user with ID: ${userDummy.id}!`;

      const response = await habitPackManagerService.uninstallHabitPack(userDummy.id, standaloneHabitPackDummy.id);

      expect(response.message).toMatch(responseMessage);
      expect(ActivitySequenceRepositoryMock.orm.delete).toHaveBeenCalledWith(
        installedPackRecordDummy.activity_sequence_id,
      );
      expect(InstalledPackServiceMock.setPackAsUninstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        standaloneHabitPackDummy.id,
      );
    });
  });

  describe('installPackAsDefaultSettings', () => {
    it('negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.installPackAsDefaultSettings(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('negative: should return that pack does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `Habit pack with ID: ${routineHabitPackDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.installPackAsDefaultSettings(userDummy.id, routineHabitPackDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('positive: should install habit pack for user as default settings', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValue(userDummy);
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValue(routineHabitPackDBResponseDummy);
      InstalledPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      HabitPackServiceMock.getHabitPack.mockResolvedValue(routineHabitPackDummy);
      UserSettingsServiceMock.getSettings.mockResolvedValueOnce(userSettingsDummy);
      const user_id = userDummy.id;

      const response = await habitPackManagerService.installPackAsDefaultSettings(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(response).toBe(userSettingsDummy);
      expect(UserSettingsServiceMock.getSettings).toHaveBeenCalledWith({ user_id });
      expect(HabitPackServiceMock.getHabitPack).toHaveBeenCalledWith(routineHabitPackDummy.id);
      expect(InstalledPackServiceMock.setPackAsInstalledForUser).toHaveBeenCalledWith(
        userDummy.id,
        routineHabitPackDummy.id,
      );
      expect(UserSettingsServiceMock.updateSettings).toHaveBeenCalled();
      expect(UserSettingsServiceMock.getSettings).toHaveBeenCalledWith({ user_id: userDummy.id });
    });
  });

  describe('getUserInstalledPacks', () => {
    it('negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.getUserInstalledPacks(userDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it("positive: should return the user's installed packs", async () => {
      const packId = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      InstalledPackRepositoryMock.fetchUserInstalledPackIds.mockResolvedValueOnce([packId]);
      HabitPackRepositoryMock.orm.find.mockResolvedValueOnce([routineHabitPackDBResponseDummy]);
      HabitPackServiceMock.serializeHabitPack.mockReturnValue(routineHabitPackDummy);

      const result = await habitPackManagerService.getUserInstalledPacks(userDummy.id);

      expect(InstalledPackRepositoryMock.fetchUserInstalledPackIds).toHaveBeenCalledWith(userDummy.id);
      expect(result).toMatchSnapshot();
    });
  });

  describe('getUserInstalledStandalonePacks', () => {
    it('negative: if the user does not exist in DB, not found error should be thrown', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackManagerService.getUserInstalledStandalonePacks(userDummy.id);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('postive: should format installed standalone pack activities from DB format to format usable by frontend', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([
          {
            ...ActivitySequenceDummy,
            pack_id: standaloneHabitPackDBResponseDummy.id,
            habit_pack: standaloneHabitPackDBResponseDummy,
            activities: standaloneHabitPackDBResponseDummy.activity_templates,
            type: 'standalone',
          },
        ]),
      };
      ActivitySequenceRepositoryMock.orm.createQueryBuilder.mockReturnValueOnce(qbMock);
      ActivityParserServiceMock.serialize.mockReturnValueOnce({
        standalone_activities: standaloneHabitPackDummy.standalone_activities,
      });

      const res = await habitPackManagerService.getUserInstalledStandalonePacks(userDummy.id);

      expect(res).toStrictEqual([
        {
          id: ActivitySequenceDummy.id,
          pack_name: standaloneHabitPackDummy.pack_name,
          pack_id: standaloneHabitPackDummy.id,
          standalone_activities: standaloneHabitPackDummy.standalone_activities,
        },
      ]);
    });
  });

  describe('linkNewlyCreatedActivities', () => {
    it("positive: adds the correct new ID of the canonical activity to this activity's linked_activity_id field", () => {
      const templatesChoicesNewIdsMap = new Map<string, string>([]);
      const templatesNewIdsMap = new Map<string, string>([]);
      const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
      const templateId = randomUUID();
      const linkedTemplateId = randomUUID();
      const linkedTemplatesNewId = randomUUID();
      const activityId = randomUUID();
      templatesNewIdsMap.set(linkedTemplateId, linkedTemplatesNewId);
      const morningRoutine = [
        {
          id: activityId,
          name: 'Deep breathing',
          duration_seconds: 180,
          log_quantity: true,
          video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
          activity_template_id: templateId,
          linked_activity_template_id: linkedTemplateId, // see docs/linked-activity-template-id.md
        },
      ];
      const linkedMorningRoutineActivities = habitPackManagerService.linkNewlyCreatedActivities(morningRoutine, {
        templatesNewIdsMap,
        templatesChoicesNewIdsMap,
        logQuantityQuestionsNewIdsMap,
      });
      expect(linkedMorningRoutineActivities).toBeArray();
      expect(linkedMorningRoutineActivities[0].linked_activity_id).toBe(linkedTemplatesNewId);
      expect(linkedMorningRoutineActivities[0].linked_activity_template_id).toBe(undefined);
    });
  });

  it('positive: if converted activity has log quantity questions that are linked they should be updated with correct new IDs', () => {
    const templatesChoicesNewIdsMap = new Map<string, string>([]);
    const templatesNewIdsMap = new Map<string, string>([]);
    const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
    const templateId = randomUUID();
    const linkedTemplateId = randomUUID();
    const linkedTemplatesNewId = randomUUID();
    const activityId = randomUUID();
    const templateQuestionId = randomUUID();
    const newQuestionId = randomUUID();
    templatesNewIdsMap.set(linkedTemplateId, linkedTemplatesNewId);
    logQuantityQuestionsNewIdsMap.set(templateQuestionId, newQuestionId);
    const morningRoutine = [
      {
        id: activityId,
        name: 'Deep breathing',
        duration_seconds: 180,
        log_quantity: true,
        video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
        activity_template_id: templateId,
        linked_activity_template_id: linkedTemplateId,
        log_quantity_questions: [
          {
            question: 'test question',
            min_value: 0,
            max_value: 10,
            min_value_description: 'test',
            max_value_description: 'test',
            linked_question_id: templateQuestionId,
          },
        ],
      },
    ];
    const linkedMorningRoutineActivities = habitPackManagerService.linkNewlyCreatedActivities(morningRoutine, {
      templatesNewIdsMap,
      templatesChoicesNewIdsMap,
      logQuantityQuestionsNewIdsMap,
    });

    expect(linkedMorningRoutineActivities[0].log_quantity_questions[0].linked_question_id).toBe(newQuestionId);
  });

  describe('linkNewlyCreatedChoices', () => {
    it('positive: if choice has linked_activity_template it should be removed and the choice should be updated with linked_activity_id of linked activity', () => {
      const templatesChoicesNewIdsMap = new Map<string, string>([]);
      const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
      const choiceLinkedIdAsTemplate = randomUUID();
      const choiceNewId = randomUUID();
      templatesChoicesNewIdsMap.set(choiceLinkedIdAsTemplate, choiceNewId);
      const morningActivityWithLinkedChoice = {
        id: randomUUID(),
        name: 'Deep breathing',
        duration_seconds: 180,
        log_quantity: true,
        video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
        activity_template_id: randomUUID(),
        linked_activity_template_id: randomUUID(),
        log_quantity_questions: [],
        choices: [
          {
            id: randomUUID(),
            name: 'Situps',
            video_urls: [],
            log_quantity: true,
            linked_activity_template_id: choiceLinkedIdAsTemplate,
          },
        ],
      };
      const updatedChoices = habitPackManagerService.linkNewlyCreatedChoices(morningActivityWithLinkedChoice, {
        templatesChoicesNewIdsMap,
        logQuantityQuestionsNewIdsMap,
      });

      expect(updatedChoices[0].linked_activity_id).toBe(choiceNewId);
      expect(updatedChoices[0].linked_activity_template_id).toBe(undefined);
    });

    it('positive: if choice has is linked to canonical choice and has log quantity questions that are linked to other questions their linked ID should be updated to link the newly created question to its canonical question', () => {
      const templatesChoicesNewIdsMap = new Map<string, string>([]);
      const logQuantityQuestionsNewIdsMap = new Map<string, string>([]);
      const choiceLinkedIdAsTemplate = randomUUID();
      const choiceNewId = randomUUID();
      const templateQuestionId = randomUUID();
      const newQuestionId = randomUUID();
      templatesChoicesNewIdsMap.set(choiceLinkedIdAsTemplate, choiceNewId);
      logQuantityQuestionsNewIdsMap.set(templateQuestionId, newQuestionId);
      const morningActivityWithLinkedChoice = {
        id: randomUUID(),
        name: 'Deep breathing',
        duration_seconds: 180,
        log_quantity: true,
        video_urls: ['https://www.youtube.com/watch?v=36mnXAQGRzc'],
        activity_template_id: randomUUID(),
        linked_activity_template_id: randomUUID(),
        log_quantity_questions: [],
        choices: [
          {
            id: randomUUID(),
            name: 'Situps',
            video_urls: [],
            log_quantity: true,
            linked_activity_template_id: choiceLinkedIdAsTemplate,
            log_quantity_questions: [
              {
                question: 'test question',
                min_value: 0,
                max_value: 10,
                min_value_description: 'test',
                max_value_description: 'test',
                linked_question_id: templateQuestionId,
              },
            ],
          },
        ],
      };
      const updatedChoices = habitPackManagerService.linkNewlyCreatedChoices(morningActivityWithLinkedChoice, {
        templatesChoicesNewIdsMap,
        logQuantityQuestionsNewIdsMap,
      });

      expect(updatedChoices[0].log_quantity_questions[0].linked_question_id).toBe(newQuestionId);
    });
  });
});
