import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  standaloneHabitPackDBResponseDummy,
  standaloneHabitPackDummy,
  deserializedStandaloneActivitiesDummy,
  deserializedRoutineActivitiesDummy,
  routineHabitPackDummy,
  serializedStandaloneActivityDummy,
  marketplaceApprovedPacksDummy,
  routineHabitPackDBResponseDummy,
} from '../../../../../test/dummies/habit-packs.dummies';
import { adminUserDummy, userDummy } from '../../../../../test/dummies';
import { HabitPackService } from './habit-pack.service';
import { HabitPackRepository } from '../../repositories/habit-pack.repository';
import {
  ActivityParserServiceMock,
  ActivityTemplateParserServiceMock,
  ActivityTemplateRepositoryMock,
  ActivityTemplateServiceMock,
  HabitPackRepositoryMock,
  UserRepositoryMock,
} from '../../../../../test/mocks';
import { ActivityTemplateService } from '../../../activity-template/services/activity-template.service';
import { ActivityTemplateParserService } from '../../../activity-template/services/activity-template-parser.service';
import { UserRepository } from '../../../user/repositories/user.repository';
import { ResponseMessage } from '../../../../shared/domain/response-message.model';
import { ActivityTemplateRepository } from '../../../activity-template/repository/activity-template.repository';
import { HabitPack } from '../../entity/habit-pack.entity';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';

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
      .overrideProvider(ActivityParserService)
      .useValue(ActivityParserServiceMock)
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
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(standaloneHabitPackDummy);
      const result = await habitPackService.getHabitPack(standaloneHabitPackDBResponseDummy.id);

      expect(result).toMatchSnapshot();
    });
  });

  describe('getMultipleHabitPacks', () => {
    it('Negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const responseMessage = `User with ID: ${userDummy.id} does not exist!`;

      let response;
      try {
        response = await habitPackService.upsertHabitPack(userDummy.id, standaloneHabitPackDummy);
      } catch (error) {
        response = error;
      }

      expect(response.message).toMatch(responseMessage);
    });

    it('positive: should fetch habit packs', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      HabitPackRepositoryMock.fetchPacksByFilter.mockResolvedValueOnce(marketplaceApprovedPacksDummy);
      ActivityTemplateParserServiceMock.serialize
        .mockReturnValueOnce(standaloneHabitPackDummy)
        .mockReturnValueOnce(routineHabitPackDummy);

      const result = await habitPackService.getMultipleHabitPacks(
        {
          is_featured: false,
          marketplace_approval_status: true,
        },
        userDummy.id,
      );

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
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
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
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
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
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);

      const result = await habitPackService.deleteHabitPack(userDummy.id, standaloneHabitPackDBResponseDummy.id);

      expect(result).toBeInstanceOf(ResponseMessage);
      expect(result.message).toEqual(responseMessage);
      expect(ActivityTemplateRepositoryMock.orm.softDelete).toHaveBeenCalled();
    });

    it('Positive: should return successful response message when deleting pack as admin user', async () => {
      const responseMessage = `Habit pack with ID: ${standaloneHabitPackDBResponseDummy.id} successfully deleted!`;
      HabitPackRepositoryMock.orm.findOne.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(adminUserDummy);

      const result = await habitPackService.deleteHabitPack(adminUserDummy.id, standaloneHabitPackDBResponseDummy.id);

      expect(result).toBeInstanceOf(ResponseMessage);
      expect(result.message).toEqual(responseMessage);
      expect(ActivityTemplateRepositoryMock.orm.softDelete).toHaveBeenCalled();
    });
  });

  describe('createHabitPack', () => {
    it('Negative: should return that the user does not exist', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
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
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockResolvedValueOnce(
        deserializedRoutineActivitiesDummy,
      );
      HabitPackRepositoryMock.orm.findOne
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);
      const responseMessage = `User with ID: ${unauthorizedUserDummy.id} is not authorized to delete habit pack with ID: ${routineHabitPackDummy.id}!`;

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
      const {
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        id,
      } = standaloneHabitPackDummy;
      const newPack = new HabitPack({
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status: false,
        user_id,
        id,
        duration: 100,
        creator_name: 'User Dummy',
      });
      const activityIds = [
        '116af843-818a-4e09-aaa2-53da041896de',
        'b8301b80-1286-464a-b0be-5838f52e2ff6',
        '74935284-e936-4247-8afa-e453484865e0',
      ];
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeStandaloneActivities.mockResolvedValueOnce(
        deserializedStandaloneActivitiesDummy,
      );
      HabitPackRepositoryMock.orm.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(standaloneHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(standaloneHabitPackDummy);
      ActivityParserServiceMock.calculateSequenceDuration.mockReturnValue(100);

      await habitPackService.upsertHabitPack(userDummy.id, standaloneHabitPackDummy);

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        newPack,
        activityIds,
        deserializedStandaloneActivitiesDummy,
      );
    });

    it('Positive: should call habitPackRepository.consistentlyUpdateHabitPack to create routine habit pack', async () => {
      const user_id = userDummy.id;
      const {
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status,
        id,
      } = routineHabitPackDummy;
      const newPack = new HabitPack({
        pack_name,
        pack_type,
        description,
        description_video_url,
        welcome_message,
        welcome_video_url,
        marketplace_request,
        marketplace_approval_status,
        user_id,
        id,
        duration: 100,
        creator_name: 'User Dummy',
      });
      const activityIds = [
        'b24c9383-f8a0-409c-bbd9-e37b9566de3b',
        '630c921d-dc9c-4107-acd2-023d7930d9bf',
        'f3dbeeb2-9284-4d39-bbd4-04cc17d40b4e',
      ];
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      ActivityTemplateParserServiceMock.deserializeRoutineActivities.mockResolvedValueOnce(
        deserializedRoutineActivitiesDummy,
      );
      HabitPackRepositoryMock.orm.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      HabitPackRepositoryMock.getHabitPack.mockResolvedValueOnce(routineHabitPackDBResponseDummy);
      ActivityTemplateParserServiceMock.serialize.mockReturnValueOnce(routineHabitPackDummy);
      ActivityParserServiceMock.calculateSequenceDuration.mockReturnValue(100);

      await habitPackService.upsertHabitPack(userDummy.id, routineHabitPackDummy);

      expect(HabitPackRepositoryMock.consistentlyUpdateHabitPack).toBeCalledWith(
        newPack,
        activityIds,
        deserializedRoutineActivitiesDummy,
      );
    });
  });

  describe('getHabitPackLongestSequence', () => {
    it('positive: should return 0 for undefined sequence (case when pack is routine and no standalone sequence is present and the other way around', () => {
      const sequenceArray = [undefined];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(0);
    });

    it('positive: should return the longest sequence duration', () => {
      ActivityParserServiceMock.calculateSequenceDuration.mockReturnValue(300);
      const sequenceArray = [
        routineHabitPackDummy.morning_activities,
        routineHabitPackDummy.break_activities,
        routineHabitPackDummy.evening_activities,
      ];
      const result = habitPackService.getHabitPackLongestSequence(sequenceArray);

      expect(result).toBe(300);
    });
  });
});
