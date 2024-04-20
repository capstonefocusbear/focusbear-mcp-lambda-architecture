import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import {
  standaloneHabitPackDBResponseDummy,
  standaloneHabitPackDummy,
  deserializedStandaloneActivitiesDummy,
  deserializedRoutineActivitiesDummy,
  routineHabitPackDummy,
  serializedStandaloneActivityDummy,
  marketplaceApprovedPacksDummy,
  routineHabitPackDBResponseDummy,
  serializedRoutineActivityDummy,
  breaksOnlyDeserializedRoutineActivitiesDummy,
} from '../../../../../test/dummies/habit-packs.dummies';
import { adminUserDummy, userDummy } from '../../../../../test/dummies';
import { HabitPackService } from './habit-pack.service';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import {
  ActivitySequenceRepositoryMock,
  ActivityTemplateParserServiceMock,
  ActivityTemplateRepositoryMock,
  ActivityTemplateServiceMock,
  HabitPackRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivityTemplateService } from '../../../activity-template/services/activity-template.service';
import { ActivityTemplateParserService } from '../../../activity-template/services/activity-template-parser.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { HabitPack } from '../../entity/habit-pack.entity';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { ActivitySequenceRepository } from '../../../activity/repositories/activity-sequence.repository';

describe('HabitPackService', () => {
  let habitPackService: HabitPackService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HabitPackService,
        HabitPackRepository,
        ActivityTemplateService,
        ActivityTemplateParserService,
        UserRepository,
        ActivityParserService,
        ActivitySequenceRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(HabitPackRepository)
      .useValue(HabitPackRepositoryMock)
      .overrideProvider(ActivityTemplateService)
      .useValue(ActivityTemplateServiceMock)
      .overrideProvider(ActivityTemplateParserService)
      .useValue(ActivityTemplateParserServiceMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityTemplateRepository)
      .useValue(ActivityTemplateRepositoryMock)
      .overrideProvider(ActivitySequenceRepository)
      .useValue(ActivitySequenceRepositoryMock)
      .compile();

    habitPackService = moduleRef.get<HabitPackService>(HabitPackService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(habitPackService).toBeDefined();
  });

  describe('getHabitPack', () => {
    const pack_id = randomUUID();
    it('negative: if habit pack does not exist in DB, throw the NotFoundException', async () => {
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(null);
      const errorMessage = `Habit pack with id: ${pack_id} does not exist!`;
      let exception: any;
      try {
        await habitPackService.getHabitPack(pack_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should return a habit pack', async () => {
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce({
        deserializedActivityTemplates: standaloneHabitPackDummy,
      });
      const result = await habitPackService.getHabitPack(standaloneHabitPackDBResponseDummy.id);

      expect(result).toMatchSnapshot();
    });
  });

  describe('getMultipleHabitPacks', () => {
    it('positive: should fetch habit packs', async () => {
      HabitPackRepositoryMock.fetchPacksByFilter.mockResolvedValueOnce(marketplaceApprovedPacksDummy);
      ActivityTemplateParserServiceMock.serialize
        .mockReturnValueOnce(standaloneHabitPackDummy)
        .mockReturnValueOnce(routineHabitPackDummy);

      const result = await habitPackService.getMultipleHabitPacks({
        is_featured: false,
        marketplace_approval_status: true,
      });

      expect(ActivityTemplateParserServiceMock.serialize).toBeCalled();
      expect(HabitPackRepositoryMock.fetchPacksByFilter).toBeCalledWith({
        is_featured: false,
        marketplace_approval_status: true,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('serializeHabitPack', () => {
    it('Positive: should return serialized pack', () => {
      const { activity_templates, pack_type, ...restOfPackData } = standaloneHabitPackDBResponseDummy;
      ActivityTemplateParserServiceMock.serialize.mockResolvedValue(serializedStandaloneActivityDummy);
      const result = habitPackService.serializeHabitPack({ activity_templates, pack_type, ...restOfPackData });

      expect(result).toMatchSnapshot();
    });
  });

  describe('deleteHabitPack', () => {
    it('Negative: if user is not pack author, throw Unauthorized exception', async () => {
      const wrongUserId = randomUUID();
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      const errorMessage = `User with ID: ${wrongUserId} is not authorized to delete habit pack with ID: ${routineHabitPackDBResponseDummy.id}!`;
      let exception: any;

      try {
        await habitPackService.deleteHabitPack(wrongUserId, routineHabitPackDBResponseDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: if habit pack does not exist in DB, throw NotFoundException', async () => {
      const pack_id = randomUUID();
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Habit pack with id: ${pack_id} does not exist!`;
      let exception: any;

      try {
        await habitPackService.deleteHabitPack(userDummy.id, pack_id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: habit pack should be deleted and successful response message should be returned', async () => {
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDBResponseDummy.id} successfully deleted!`;
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      const result = await habitPackService.deleteHabitPack(userDummy.id, standaloneHabitPackDBResponseDummy.id);

      expect(result).toBeInstanceOf(ResponseMessage);
      expect(result.message).toEqual(responseMessage);
      expect(ActivityTemplateRepositoryMock.orm.softDelete).toHaveBeenCalled();
    });

    it('Positive: should return successful response message when deleting pack as admin user', async () => {
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDBResponseDummy.id} successfully deleted!`;
      HabitPackRepositoryMock.orm.findOneBy.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(adminUserDummy);

      const result = await habitPackService.deleteHabitPack(adminUserDummy.id, standaloneHabitPackDBResponseDummy.id);

      expect(result).toBeInstanceOf(ResponseMessage);
      expect(result.message).toEqual(responseMessage);
      expect(ActivityTemplateRepositoryMock.orm.softDelete).toHaveBeenCalled();
    });
  });

  describe('upsertHabitPack', () => {
    const { morning_activities, break_activities, evening_activities, ...restOfRoutinePackDummy } =
      routineHabitPackDummy;
    it('Negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackService.upsertHabitPack(userDummy.id, standaloneHabitPackDummy);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('negative: should throw an unauthorized exception because user is not the pack author', async () => {
      const unauthorizedUserDummy = { ...userDummy, id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockReturnValueOnce({
        deserializedActivityTemplates: deserializedRoutineActivitiesDummy,
        logQuantityQuestions: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);
      const responseMessage = `User with ID: ${unauthorizedUserDummy.id} is not authorized to edit habit pack with ID: ${routineHabitPackDummy.id}!`;

      let response;
      try {
        response = await habitPackService.upsertHabitPack(unauthorizedUserDummy.id, routineHabitPackDummy);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('Positive: should call habitPackRepository.consistentlyUpdateHabitPack to create standalone habit pack', async () => {
      const user_id = userDummy.id;
      const { standalone_activities, ...restOfStandalonePackDummy } = standaloneHabitPackDummy;
      const newPack = new HabitPack({
        ...restOfStandalonePackDummy,
        marketplace_approval_status: false,
        user_id,
        description_plain_text: 'test desc',
        welcome_message_plain_text: 'test welcome message',
        morning_routine_duration_seconds: 0,
        evening_routine_duration_seconds: 0,
        duration: 600,
        creator_name: userDummy.username,
        breaks_only: false,
      });
      const activityIds = [
        '116af843-818a-4e09-aaa2-53da041896de',
        'b8301b80-1286-464a-b0be-5838f52e2ff6',
        '74935284-e936-4247-8afa-e453484865e0',
      ];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeStandaloneActivities.mockReturnValueOnce({
        deserializedActivityTemplates: deserializedStandaloneActivitiesDummy,
        logQuantityQuestions: [],
        packTutorials: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce({
        deserializedActivityTemplates: standaloneHabitPackDummy,
      });

      await habitPackService.upsertHabitPack(userDummy.id, standaloneHabitPackDummy);

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        newPack,
        activityIds,
        deserializedStandaloneActivitiesDummy,
        [],
        [],
      );
    });

    it('Positive: should call habitPackRepository.consistentlyUpdateHabitPack to create routine habit pack', async () => {
      const user_id = userDummy.id;
      const newPack = new HabitPack({
        ...restOfRoutinePackDummy,
        user_id,
        duration: 300,
        creator_name: userDummy.username,
        description_plain_text: 'test desc',
        welcome_message_plain_text: 'test welcome message',
        morning_routine_duration_seconds: 300,
        evening_routine_duration_seconds: 150,
        breaks_only: false,
      });
      const activityIds = [
        'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
        '630c921d-dc9c-4107-acd2-023d7930d9bf',
        'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      ];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockReturnValueOnce({
        deserializedActivityTemplates: deserializedRoutineActivitiesDummy,
        logQuantityQuestions: [],
        packTutorials: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);

      await habitPackService.upsertHabitPack(userDummy.id, routineHabitPackDummy);

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        newPack,
        activityIds,
        deserializedRoutineActivitiesDummy,
        [],
        [],
      );
    });

    it('Positive: admin fields should remain false if non admin user tries changing them to true (marketplace_approval_status, is_featured, featured_for_onboarding)', async () => {
      const newPack = new HabitPack({
        ...restOfRoutinePackDummy,
        user_id: userDummy.id,
        duration: 300,
        creator_name: userDummy.username,
      });
      const activityIds = [
        'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
        '630c921d-dc9c-4107-acd2-023d7930d9bf',
        'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      ];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockReturnValueOnce({
        deserializedActivityTemplates: deserializedRoutineActivitiesDummy,
        logQuantityQuestions: [],
        packTutorials: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);

      await habitPackService.upsertHabitPack(userDummy.id, {
        ...routineHabitPackDummy,
        marketplace_approval_status: true,
        is_featured: true,
        featured_for_onboarding: true,
        creator_name: userDummy.username,
      });

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        {
          ...newPack,
          marketplace_approval_status: false,
          is_featured: false,
          featured_for_onboarding: false,
          description_plain_text: 'test desc',
          welcome_message_plain_text: 'test welcome message',
          morning_routine_duration_seconds: 300,
          evening_routine_duration_seconds: 150,
          breaks_only: false,
        },
        activityIds,
        deserializedRoutineActivitiesDummy,
        [],
        [],
      );
    });

    it('Positive: admin user should be able to change pack admin fields to true (marketplace_approval_status, is_featured, featured_for_onboarding)', async () => {
      const newPack = new HabitPack({
        ...restOfRoutinePackDummy,
        user_id: adminUserDummy.id,
        duration: 300,
        creator_name: userDummy.username,
      });
      const activityIds = [
        'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
        '630c921d-dc9c-4107-acd2-023d7930d9bf',
        'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      ];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(adminUserDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockReturnValueOnce({
        deserializedActivityTemplates: deserializedRoutineActivitiesDummy,
        logQuantityQuestions: [],
        packTutorials: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);

      await habitPackService.upsertHabitPack(adminUserDummy.id, {
        ...routineHabitPackDummy,
        marketplace_approval_status: true,
        is_featured: true,
        featured_for_onboarding: true,
        creator_name: adminUserDummy.username,
      });

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        {
          ...newPack,
          marketplace_approval_status: true,
          is_featured: true,
          featured_for_onboarding: true,
          description_plain_text: 'test desc',
          welcome_message_plain_text: 'test welcome message',
          morning_routine_duration_seconds: 300,
          evening_routine_duration_seconds: 150,
          breaks_only: false,
        },
        activityIds,
        deserializedRoutineActivitiesDummy,
        [],
        [],
      );
    });

    it('Positive: pack should be saved with breaks_only value as true if it is routine type and has only break activities', async () => {
      const user_id = userDummy.id;
      const newPack = new HabitPack({
        ...restOfRoutinePackDummy,
        user_id,
        duration: 30,
        creator_name: userDummy.username,
        description_plain_text: 'test desc',
        welcome_message_plain_text: 'test welcome message',
        morning_routine_duration_seconds: 0,
        evening_routine_duration_seconds: 0,
        breaks_only: true,
      });
      const activityIds = ['630c921d-dc9c-4107-acd2-023d7930d9bf'];
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockReturnValueOnce({
        deserializedActivityTemplates: breaksOnlyDeserializedRoutineActivitiesDummy,
        logQuantityQuestions: [],
        packTutorials: [],
      });
      HabitPackRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce({
        ...routineHabitPackDummy,
        morning_activities: [],
        evening_activities: [],
      });
      await habitPackService.upsertHabitPack(userDummy.id, {
        ...routineHabitPackDummy,
        morning_activities: [],
        evening_activities: [],
      });

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        newPack,
        activityIds,
        breaksOnlyDeserializedRoutineActivitiesDummy,
        [],
        [],
      );
    });
  });

  describe('getHabitPackLongestSequence', () => {
    it('positive: should return 0 for undefined sequence (case when pack is routine and no standalone sequence is present and the other way around', () => {
      const sequenceArray = [undefined];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(0);
    });

    it('positive: should return the longest sequence duration (morning sequence is 300 sec)', () => {
      const sequenceArray = [
        routineHabitPackDummy.morning_activities,
        routineHabitPackDummy.break_activities,
        routineHabitPackDummy.evening_activities,
      ];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(300);
    });

    it('positive: should return the longest sequence duration (evening sequence is 600 sec)', () => {
      const sequenceArray = [
        serializedRoutineActivityDummy.morning_activities,
        serializedRoutineActivityDummy.break_activities,
        serializedRoutineActivityDummy.evening_activities,
      ];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(600);
    });

    it('positive: should return the longest sequence duration (both morning & evening sequences are the 180 seconds)', () => {
      const sequenceArray = [
        [{ id: randomUUID(), pack_id: randomUUID(), name: 'test pack', duration_seconds: 180 }],
        [{ id: randomUUID(), pack_id: randomUUID(), name: 'test pack', duration_seconds: 120 }],
        [{ id: randomUUID(), pack_id: randomUUID(), name: 'test pack', duration_seconds: 180 }],
      ];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(180);
    });
  });
});
