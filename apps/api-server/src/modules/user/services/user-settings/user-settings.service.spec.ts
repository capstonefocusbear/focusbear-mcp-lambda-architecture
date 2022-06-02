import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { serializedActivityDummy, userDummy, userSettingsDBResponseDummy } from '../../../../../test/dummies ';
import { ActivityParserServiceMock, UserRepositoryMock } from '../../../../../test/mocks';
import { ActivityParserService } from '../../../activity/services/activity-parser/activity-parser.service';
import { UserRepository } from '../../repositories/user.repository';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, UserSettingsService, ActivityParserService],
    })
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(ActivityParserService)
      .useValue(ActivityParserServiceMock)
      .compile();

    userSettingsService = moduleRef.get<UserSettingsService>(UserSettingsService);
  });

  it('should be defined', () => {
    expect(userSettingsService).toBeDefined();
  });

  describe('getSettings', () => {
    const user_id = randomUUID();

    it('negative: if user user does not exist in DB, throw the NotFoundException', async () => {
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${user_id} does not exists!`;
      let exception: any;

      try {
        await userSettingsService.getSettings({ user_id });
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return serialized user settings data', async () => {
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce(userSettingsDBResponseDummy);
      ActivityParserServiceMock.serialize.mockResolvedValueOnce(serializedActivityDummy);

      const result = await userSettingsService.getSettings({ user_id });

      expect(result).toBeDefined();
    });
  });

  describe('updateSettings', () => {
    const user_id = randomUUID();

    it('negative: if user user does not exist in DB, throw the NotFoundException', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `User with id: ${user_id} does not exists!`;
      let exception: any;

      try {
        await userSettingsService.updateSettings({ user_id }, serializedActivityDummy);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: should return serialized user settings data', async () => {
      UserRepositoryMock.orm.findOne.mockResolvedValueOnce(userDummy);
      UserRepositoryMock.getUserSettings.mockResolvedValueOnce(userSettingsDBResponseDummy);
      ActivityParserServiceMock.serialize.mockResolvedValueOnce(serializedActivityDummy);

      const result = await userSettingsService.getSettings({ user_id });

      expect(result).toBeDefined();
    });
  });
});
