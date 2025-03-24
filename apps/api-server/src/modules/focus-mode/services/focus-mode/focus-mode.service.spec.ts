import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { HttpException, NotFoundException } from '@nestjs/common';
import {
  FocusModeDummy,
  UpsertFocusModeDummy,
  focusModeTemplateDBResponseDummy,
  userDummy,
} from '../../../../../test/dummies';
import {
  FocusModeRepositoryMock,
  FocusModeTagRepositoryMock,
  InstalledFocusModeTemplatesRepositoryMock,
  SentryServiceMock,
  UserDailyStatsServiceMock,
} from '../../../../../test/mocks';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { FocusModeService } from './focus-mode.service';
import { InstalledFocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/installed-focus-mode-templates.reporisoty';
import { InstalledFocusModeTemplate } from '../../../focus-mode-template/entities/installed-focus-mode_templates.entity';
import { FocusModeTagRepository } from '../../repositories/focus-mode-tags.repository';
import { CreateFocusModeDto } from '../../dto/create-focus-mode.dto';
import { FocusMode } from '../../entities/focus-mode.entity';
import { UserDailyStatsService } from '../../../user/services/user-daily-stats/user-daily-stats.service';
import { UserProgressUpdateTypes } from '../../../user/domain/user-progress-update-types.enum';
import { FocusModeTag } from '../../entities/focus-mode-tags';

describe('FocusModeService', () => {
  let focusModeService: FocusModeService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeService,
        FocusModeRepository,
        InstalledFocusModeTemplatesRepository,
        FocusModeTagRepository,
        UserDailyStatsService,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(FocusModeRepository)
      .useValue(FocusModeRepositoryMock)
      .overrideProvider(InstalledFocusModeTemplatesRepository)
      .useValue(InstalledFocusModeTemplatesRepositoryMock)
      .overrideProvider(FocusModeTagRepository)
      .useValue(FocusModeTagRepositoryMock)
      .overrideProvider(UserDailyStatsService)
      .useValue(UserDailyStatsServiceMock)
      .compile();

    focusModeService = moduleRef.get<FocusModeService>(FocusModeService);
  });

  it('should be defined', () => {
    expect(focusModeService).toBeDefined();
  });

  describe('createFocusMode', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
    });

    const createFocusModeDto: CreateFocusModeDto = {
      id: randomUUID(),
      name: 'some string',
      allowed_apps: ['chrome.exe'],
      allowed_urls: ['https://focusbear.io'],
      tags: [{ id: randomUUID(), text: 'Test Tag' }],
    };
    const user_id = userDummy.id;

    it('positive: repository create should be called', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, createFocusModeDto);

      expect(FocusModeRepositoryMock.orm.save).toBeCalledWith(
        new FocusMode({ ...createFocusModeDto, user_id, tags: expect.toBeArray() }),
      );
    });

    it('positive: if focus mode IS NOT default created when installing apps, onboarding progress should be updated', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, createFocusModeDto);

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toBeCalledWith(
        user_id,
        UserProgressUpdateTypes.EDIT_FOCUS_MODE,
      );
    });

    it('positive: if focus mode IS default created when installing apps, onboarding progress should NOT be updated', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, { ...createFocusModeDto, metadata: { isDefault: true } });

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toBeCalledTimes(0);
    });
  });

  describe('updateFocusMode', () => {
    const updateFocusModeDto: UpdateFocusModeDto = {
      name: 'some string',
      id: FocusModeDummy.id,
      allowed_apps: ['chrome.exe'],
      allowed_urls: ['https://focusbear.io'],
      tags: [{ id: randomUUID(), text: 'Test Tag' }],
    };
    const user_id = randomUUID();
    FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(FocusModeDummy);

    it('negative: if focus mode does not exist not found error should be thrown', async () => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Focus mode with ID: ${updateFocusModeDto.id} does not exist`;
      let exception: any;

      try {
        await focusModeService.updateFocusMode(user_id, updateFocusModeDto.id, updateFocusModeDto);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: repository update should be called', async () => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(FocusModeDummy);
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.updateFocusMode(user_id, updateFocusModeDto.id, updateFocusModeDto);

      expect(FocusModeRepositoryMock.orm.save).toBeCalledWith(
        new FocusMode({ ...FocusModeDummy, ...updateFocusModeDto, user_id, tags: expect.toBeArray() }),
      );
    });
  });

  describe('delete', () => {
    const id = randomUUID();

    it('positive: repository delete should be called', async () => {
      await focusModeService.delete(id);

      expect(FocusModeRepositoryMock.orm.delete).toBeCalledWith(id);
    });
  });

  describe('fetchUserFocusModes', () => {
    it('positive: should fetch array of user focus modes', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([FocusModeDummy]);

      const result = await focusModeService.fetchUserFocusModes(userDummy.id);

      expect(FocusModeRepositoryMock.orm.find).toBeCalledWith({ where: { user_id: userDummy.id } });
      expect(result).toEqual([FocusModeDummy]);
    });
  });

  describe('updateFocusModes', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('positive: should call update on supplied user focus modes', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([FocusModeDummy]);

      await focusModeService.updateFocusModes(userDummy.id, [{ ...UpsertFocusModeDummy, id: FocusModeDummy.id }]);

      expect(FocusModeRepositoryMock.orm.save).toBeCalledWith({ ...FocusModeDummy });
    });

    it('positive: if a focus mode contains tags the tags should be saved', async () => {
      const tagId = randomUUID();
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([{ ...FocusModeDummy }]);
      const savedTag = new FocusModeTag({ text: 'Some tag', id: tagId, user_id: userDummy.id });

      await focusModeService.updateFocusModes(userDummy.id, [
        { ...UpsertFocusModeDummy, id: FocusModeDummy.id, tags: [{ text: 'Some tag', id: tagId }] },
      ]);

      expect(FocusModeTagRepositoryMock.upsert).toBeCalledWith(savedTag, ['id']);
    });
  });

  describe('deleteFocusMode', () => {
    it('positive: if focus mode does not have a template id, only softDelete should be called', async () => {
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce(FocusModeDummy);

      await focusModeService.deleteFocusMode(FocusModeDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toBeCalledTimes(0);
      expect(FocusModeRepositoryMock.orm.softDelete).toBeCalledWith(FocusModeDummy.id);
    });

    it('positive: if focus mode has a template id, installed record should be fetched and updated as uninstalled', async () => {
      const installedRecord = new InstalledFocusModeTemplate({
        user_id: userDummy.id,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
        installation_status: true,
      });
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...FocusModeDummy,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
      });
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockResolvedValueOnce(installedRecord);

      await focusModeService.deleteFocusMode(FocusModeDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toBeCalledWith(installedRecord.id, {
        installation_status: false,
      });
    });
  });

  describe('deleteRemovedFocusModeTags', () => {
    it('positive: should call delete on tags that are not included in update data', async () => {
      const tagIdOne = randomUUID();
      const tagIdTwo = randomUUID();
      const existingTags = [
        new FocusModeTag({ id: tagIdOne, text: 'Test Tag', user_id: userDummy.id }),
        new FocusModeTag({ id: tagIdTwo, text: 'Test Tag Two', user_id: userDummy.id }),
      ];
      const incomingTags = [{ id: tagIdOne, text: 'Test Tag', user_id: userDummy.id }];

      await focusModeService.deleteRemovedFocusModeTags(userDummy.id, existingTags, incomingTags);

      expect(FocusModeTagRepositoryMock.orm.delete).toBeCalledWith({ id: tagIdTwo, user_id: userDummy.id });
    });
  });

  describe('validateFocusModeName', () => {
    const dummyName = 'Study Focus Mode';
    it('negative: should throw an error if user already has focus mode with same name', async () => {
      const errorMessage = `Focus mode with name: ${dummyName} already exists for user with ID: ${userDummy.id}!`;
      let exception;

      try {
        await focusModeService.validateFocusModeName(dummyName, userDummy.id, [{ name: dummyName }]);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeInstanceOf(HttpException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('positive: if focus mode name is unique for user not error should be thrown', async () => {
      let exception;

      try {
        await focusModeService.validateFocusModeName('New Mode Name', userDummy.id, [{ name: dummyName }]);
      } catch (error) {
        exception = error;
      }

      expect(exception).not.toBeDefined();
    });
  });

  describe('getUserFocusTags', () => {
    it('positive: should get user focus mode tags', async () => {
      await focusModeService.getUserFocusTags(userDummy.id);

      expect(FocusModeTagRepositoryMock.orm.find).toBeCalledWith({
        where: { user_id: userDummy.id },
        select: ['id', 'text'],
      });
    });
  });

  describe('upsertFocusModeTag', () => {
    it('positive: should get user focus mode tags', async () => {
      const focusTagDummy = { id: randomUUID(), text: 'Tag Name' };
      await focusModeService.upsertFocusModeTag(focusTagDummy, userDummy.id);

      expect(FocusModeTagRepositoryMock.upsert).toBeCalledWith(
        new FocusModeTag({ ...focusTagDummy, user_id: userDummy.id }),
        ['id'],
      );
    });
  });

  describe('deleteFocusModeTag', () => {
    it('positive: should get user focus mode tags', async () => {
      const dummyTagId = randomUUID();

      await focusModeService.deleteFocusModeTag(dummyTagId, userDummy.id);

      expect(FocusModeTagRepositoryMock.orm.delete).toBeCalledWith({ id: dummyTagId, user_id: userDummy.id });
    });
  });
});
