import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@app/observability';
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

      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusMode({ ...createFocusModeDto, user_id, tags: expect.toBeArray(), is_ai_enabled: true }),
      );
    });

    it('positive: should persist is_ai_enabled as false when explicitly provided', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, { ...createFocusModeDto, is_ai_enabled: false });

      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusMode({ ...createFocusModeDto, user_id, tags: expect.toBeArray(), is_ai_enabled: false }),
      );
    });

    it('positive: if focus mode IS NOT default created when installing apps, onboarding progress should be updated', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, createFocusModeDto);

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toHaveBeenCalledWith(
        user_id,
        UserProgressUpdateTypes.EDIT_FOCUS_MODE,
      );
    });

    it('positive: if focus mode IS default created when installing apps, onboarding progress should NOT be updated', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.createFocusMode(user_id, { ...createFocusModeDto, metadata: { isDefault: true } });

      expect(UserDailyStatsServiceMock.updateUserOnboardingProgress).toHaveBeenCalledTimes(0);
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

    beforeEach(() => {
      FocusModeRepositoryMock.orm.findOne.mockReset();
      FocusModeRepositoryMock.orm.find.mockReset();
      FocusModeRepositoryMock.orm.save.mockReset();
    });

    it('negative: if focus mode does not exist not found error should be thrown', async () => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(null);
      const errorMessage = `Focus mode with ID: ${updateFocusModeDto.id} does not exist or does not belong to user`;
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

      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusMode({ ...FocusModeDummy, ...updateFocusModeDto, user_id, tags: expect.toBeArray() }),
      );
      expect(FocusModeRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: updateFocusModeDto.id, user_id },
      });
    });

    it('positive: should persist is_ai_enabled as false when explicitly provided on update', async () => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(FocusModeDummy);
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([]);

      await focusModeService.updateFocusMode(user_id, updateFocusModeDto.id, {
        ...updateFocusModeDto,
        is_ai_enabled: false,
      });

      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusMode({
          ...FocusModeDummy,
          ...updateFocusModeDto,
          user_id,
          tags: expect.toBeArray(),
          is_ai_enabled: false,
        }),
      );
    });

    it('negative: should not update another user focus mode', async () => {
      FocusModeRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await expect(focusModeService.updateFocusMode(user_id, updateFocusModeDto.id, updateFocusModeDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(FocusModeRepositoryMock.orm.findOne).toHaveBeenCalledWith({
        where: { id: updateFocusModeDto.id, user_id },
      });
      expect(FocusModeRepositoryMock.orm.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const id = randomUUID();

    it('positive: repository delete should be called', async () => {
      await focusModeService.delete(id);

      expect(FocusModeRepositoryMock.orm.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('fetchUserFocusModes', () => {
    it('positive: should fetch array of user focus modes', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([FocusModeDummy]);

      const result = await focusModeService.fetchUserFocusModes(userDummy.id);

      expect(FocusModeRepositoryMock.orm.find).toHaveBeenCalledWith({ where: { user_id: userDummy.id } });
      expect(result).toEqual([FocusModeDummy]);
    });
  });

  describe('updateFocusModes', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('positive: should call update on supplied user focus modes', async () => {
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce(FocusModeDummy);
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([FocusModeDummy]);

      await focusModeService.updateFocusModes(userDummy.id, [{ ...UpsertFocusModeDummy, id: FocusModeDummy.id }]);

      expect(FocusModeRepositoryMock.orm.findOneBy).toHaveBeenCalledWith({ id: FocusModeDummy.id, user_id: userDummy.id });
      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith({ ...FocusModeDummy });
    });

    it('positive: if a focus mode contains tags the tags should be saved', async () => {
      const tagId = randomUUID();
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...FocusModeDummy });
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([{ ...FocusModeDummy }]);
      const savedTag = new FocusModeTag({ text: 'Some tag', id: tagId, user_id: userDummy.id });

      await focusModeService.updateFocusModes(userDummy.id, [
        { ...UpsertFocusModeDummy, id: FocusModeDummy.id, tags: [{ text: 'Some tag', id: tagId }] },
      ]);

      expect(FocusModeTagRepositoryMock.upsert).toHaveBeenCalledWith(savedTag, ['id']);
    });

    it('negative: should throw if focus mode does not belong to the user in bulk update', async () => {
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      await expect(
        focusModeService.updateFocusModes(userDummy.id, [{ ...UpsertFocusModeDummy, id: FocusModeDummy.id }]),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(FocusModeRepositoryMock.orm.save).not.toHaveBeenCalled();
    });

    it('negative: should not partially save when one focus mode in batch fails ownership validation', async () => {
      const secondId = randomUUID();
      FocusModeRepositoryMock.orm.findOneBy
        .mockResolvedValueOnce({ ...FocusModeDummy })
        .mockResolvedValueOnce(null);

      await expect(
        focusModeService.updateFocusModes(userDummy.id, [
          { ...UpsertFocusModeDummy, id: FocusModeDummy.id },
          { ...UpsertFocusModeDummy, id: secondId, name: 'Second mode' },
        ]),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(FocusModeRepositoryMock.orm.save).not.toHaveBeenCalled();
      expect(FocusModeTagRepositoryMock.upsert).not.toHaveBeenCalled();
    });
  });

  describe('deleteFocusMode', () => {
    beforeEach(() => {
      FocusModeRepositoryMock.orm.findOneBy.mockReset();
      FocusModeRepositoryMock.orm.softDelete.mockReset();
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockReset();
      InstalledFocusModeTemplatesRepositoryMock.orm.update.mockReset();
    });

    it('positive: if focus mode does not have a template id, only softDelete should be called', async () => {
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce(FocusModeDummy);

      await focusModeService.deleteFocusMode(userDummy.id, FocusModeDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toHaveBeenCalledTimes(0);
      expect(FocusModeRepositoryMock.orm.findOneBy).toHaveBeenCalledWith({ id: FocusModeDummy.id, user_id: userDummy.id });
      expect(FocusModeRepositoryMock.orm.softDelete).toHaveBeenCalledWith(FocusModeDummy.id);
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

      await focusModeService.deleteFocusMode(userDummy.id, FocusModeDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toHaveBeenCalledWith(installedRecord.id, {
        installation_status: false,
      });
    });

    it('negative: should throw when focus mode does not exist or does not belong to user', async () => {
      FocusModeRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);

      await expect(focusModeService.deleteFocusMode(userDummy.id, FocusModeDummy.id)).rejects.toBeInstanceOf(NotFoundException);

      expect(FocusModeRepositoryMock.orm.softDelete).not.toHaveBeenCalled();
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

      expect(FocusModeTagRepositoryMock.orm.delete).toHaveBeenCalledWith({ id: tagIdTwo, user_id: userDummy.id });
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

      expect(FocusModeTagRepositoryMock.orm.find).toHaveBeenCalledWith({
        where: { user_id: userDummy.id },
        select: ['id', 'text'],
      });
    });
  });

  describe('upsertFocusModeTag', () => {
    it('positive: should get user focus mode tags', async () => {
      const focusTagDummy = { id: randomUUID(), text: 'Tag Name' };
      await focusModeService.upsertFocusModeTag(focusTagDummy, userDummy.id);

      expect(FocusModeTagRepositoryMock.upsert).toHaveBeenCalledWith(
        new FocusModeTag({ ...focusTagDummy, user_id: userDummy.id }),
        ['id'],
      );
    });
  });

  describe('deleteFocusModeTag', () => {
    it('positive: should get user focus mode tags', async () => {
      const dummyTagId = randomUUID();

      await focusModeService.deleteFocusModeTag(dummyTagId, userDummy.id);

      expect(FocusModeTagRepositoryMock.orm.delete).toHaveBeenCalledWith({ id: dummyTagId, user_id: userDummy.id });
    });
  });
});
