import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import {
  FocusModeTagsDtoDummy,
  FocusModeTagsDummy,
  focusModeTemplateDBResponseDummy,
  userDummy,
} from '../../../../test/dummies';
import {
  FocusModeRepositoryMock,
  FocusModeServiceMock,
  FocusModeTagRepositoryMock,
  FocusModeTemplatesRepositoryMock,
  InstalledFocusModeTemplatesRepositoryMock,
  SentryServiceMock,
  UserRepositoryMock,
} from '../../../../test/mocks';
import { MarketplaceRequestType } from '../../habit-pack/domain/marketplace-request.enum';
import { UserTypes } from '../../user/domain/user-types.enum';
import { UserRepository } from '../../user/repositories/user.repository';
import { UpsertFocusModeTemplateDto } from '../dto/upsert-focus-mode-template.dto';
import { FocusModeTemplatesRepository } from '../repositories/focus-mode-templates.repository';
import { FocusModeTemplatesService } from './focus-mode-templates.service';
import { InstalledFocusModeTemplatesRepository } from '../repositories/installed-focus-mode-templates.reporisoty';
import { InstalledFocusModeTemplate } from '../entities/installed-focus-mode_templates.entity';
import { FocusModeRepository } from '../../focus-mode/repositories/focus-mode.repository';
import { FocusModeTemplate } from '../entities/focus-mode-template.entity';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { FocusModeTagRepository } from '../../focus-mode/repositories/focus-mode-tags.repository';
import { FocusModeTag } from '../../focus-mode/entities/focus-mode-tags';
import { CreateFocusModeTagDto } from '../../focus-mode/dto/create-focus-mode-tag.dto';
import { FocusMode } from '../../focus-mode/entities/focus-mode.entity';

describe('FocusModeTemplatesService', () => {
  let focusModeTemplateService: FocusModeTemplatesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeTemplatesService,
        FocusModeTemplatesRepository,
        UserRepository,
        FocusModeRepository,
        InstalledFocusModeTemplatesRepository,
        FocusModeService,
        FocusModeTagRepository,
        {
          provide: SENTRY_TOKEN,
          useValue: SentryServiceMock,
        },
      ],
    })
      .overrideProvider(FocusModeTemplatesRepository)
      .useValue(FocusModeTemplatesRepositoryMock)
      .overrideProvider(UserRepository)
      .useValue(UserRepositoryMock)
      .overrideProvider(FocusModeRepository)
      .useValue(FocusModeRepositoryMock)
      .overrideProvider(InstalledFocusModeTemplatesRepository)
      .useValue(InstalledFocusModeTemplatesRepositoryMock)
      .overrideProvider(FocusModeService)
      .useValue(FocusModeServiceMock)
      .overrideProvider(FocusModeTagRepository)
      .useValue(FocusModeTagRepositoryMock)
      .compile();

    focusModeTemplateService = moduleRef.get<FocusModeTemplatesService>(FocusModeTemplatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(focusModeTemplateService).toBeDefined();
  });

  describe('upsertFocusModeTemplate', () => {
    const focusModeTemplateDtoDummy: UpsertFocusModeTemplateDto = {
      id: randomUUID(),
      name: 'Test Focus Mode Template',
      description: '<p>Text description</p>',
      description_video_url: 'www.bah.com',
      welcome_message: '<p>Welcome message text</p>',
      welcome_video_url: 'https:blah.io',
      marketplace_request: MarketplaceRequestType.requested,
      marketplace_approval_status: false,
      featured_for_onboarding: false,
      is_featured: false,
      language: 'en',
      tags: FocusModeTagsDtoDummy,
    };

    it('Negative: should return not found message for invalid user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.upsertFocusModeTemplate(focusModeTemplateDtoDummy, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: should return message saying user is not authorized to edit focus mode template if they are neither admin user or the author', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...focusModeTemplateDBResponseDummy,
        author_id: randomUUID(),
      });
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to edit focus mode template with ID: ${focusModeTemplateDtoDummy.id}!`;
      let exception: any;

      try {
        await focusModeTemplateService.upsertFocusModeTemplate(focusModeTemplateDtoDummy, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should call focusModeTemplateRepository.orm.save with upsert dto and added properties', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeServiceMock.saveFocusModeTags.mockResolvedValueOnce([
        new FocusModeTag({ ...focusModeTemplateDtoDummy.tags[0] }),
      ]);

      await focusModeTemplateService.upsertFocusModeTemplate(focusModeTemplateDtoDummy, userDummy.id);

      expect(FocusModeTemplatesRepositoryMock.orm.save).toHaveBeenCalledWith({
        ...focusModeTemplateDtoDummy,
        author_id: userDummy.id,
        author_name: userDummy.username,
        welcome_message_plain_text: 'Welcome message text',
        description_plain_text: 'Text description',
      });
    });

    it('Positive: admin user should be able to change admin properties to true', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });
      FocusModeServiceMock.saveFocusModeTags.mockResolvedValueOnce([
        new FocusModeTag({ ...focusModeTemplateDtoDummy.tags[0] }),
      ]);

      await focusModeTemplateService.upsertFocusModeTemplate(
        {
          ...focusModeTemplateDtoDummy,
          marketplace_approval_status: true,
          is_featured: true,
          featured_for_onboarding: true,
          author_name: userDummy.username,
        },
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusModeTemplate({
          ...focusModeTemplateDtoDummy,
          author_id: userDummy.id,
          author_name: userDummy.username,
          marketplace_approval_status: true,
          is_featured: true,
          featured_for_onboarding: true,
          welcome_message_plain_text: 'Welcome message text',
          description_plain_text: 'Text description',
          tags: FocusModeTagsDummy,
        }),
      );
    });

    it('Positive: standard user should not be able to change admin properties, they should be saved as false if standard user tries changing them to true', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy });
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      FocusModeServiceMock.saveFocusModeTags.mockResolvedValueOnce([
        new FocusModeTag({ ...focusModeTemplateDtoDummy.tags[0] }),
      ]);

      await focusModeTemplateService.upsertFocusModeTemplate(
        {
          ...focusModeTemplateDtoDummy,
          marketplace_approval_status: true,
          is_featured: true,
          featured_for_onboarding: true,
        },
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.orm.save).toHaveBeenCalledWith({
        ...focusModeTemplateDtoDummy,
        author_id: userDummy.id,
        author_name: userDummy.username,
        welcome_message_plain_text: 'Welcome message text',
        description_plain_text: 'Text description',
      });
    });

    it("Positive: should delete existing focus mode tags for template that aren't part of incoming tags", async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);
      FocusModeServiceMock.saveFocusModeTags.mockResolvedValueOnce([
        new FocusModeTag({ ...focusModeTemplateDtoDummy.tags[0] }),
      ]);

      await focusModeTemplateService.upsertFocusModeTemplate(
        { ...focusModeTemplateDtoDummy, tags: [focusModeTemplateDBResponseDummy.tags[0] as CreateFocusModeTagDto] },
        userDummy.id,
      );

      expect(FocusModeTagRepositoryMock.orm.delete).toHaveBeenCalledWith({
        id: focusModeTemplateDBResponseDummy.tags[1].id,
        user_id: userDummy.id,
      });
    });
  });

  describe('deleteFocusModeTemplate', () => {
    it('Negative: should return not found message for invalid user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.deleteFocusModeTemplate(randomUUID(), userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: should return not found message for focus mode template', async () => {
      const template_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Focus mode template with ID: ${template_id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.deleteFocusModeTemplate(template_id, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: if user is not template author or admin user, unauthorized exception should be thrown', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce({
        ...focusModeTemplateDBResponseDummy,
        author_id: randomUUID(),
      });
      const errorMessage = `User with ID: ${userDummy.id} is not authorized to delete focus mode template with ID: ${focusModeTemplateDBResponseDummy.id}`;
      let exception: any;

      try {
        await focusModeTemplateService.deleteFocusModeTemplate(focusModeTemplateDBResponseDummy.id, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(UnauthorizedException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: Focus mode template should be soft-deleted and successfull response message should be returned', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);

      const response = await focusModeTemplateService.deleteFocusModeTemplate(
        focusModeTemplateDBResponseDummy.id,
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.orm.softDelete).toHaveBeenCalledWith({
        id: focusModeTemplateDBResponseDummy.id,
      });
      expect(response).toBeInstanceOf(ResponseMessage);
    });
  });

  describe('installFocusModeForUser', () => {
    it('Negative: should return not found message for invalid user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.installFocusModeForUser(randomUUID(), userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: should return not found message for focus mode template', async () => {
      const template_id = randomUUID();
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `Focus mode template with ID: ${template_id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.installFocusModeForUser(template_id, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Negative: if focus mode template is already installed, should return bad request expection', async () => {
      const installedRecord = new InstalledFocusModeTemplate({
        user_id: userDummy.id,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
        installation_status: true,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockResolvedValueOnce(installedRecord);
      const responseMessage = `User with ID: ${userDummy.id} already has focus mode template with ID: ${focusModeTemplateDBResponseDummy.id} installed!`;
      let exception;

      try {
        await focusModeTemplateService.installFocusModeForUser(focusModeTemplateDBResponseDummy.id, userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception.message).toBe(responseMessage);
      expect(exception).toBeInstanceOf(BadRequestException);
    });

    it('Positive: should create focus mode for user from template', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);

      await focusModeTemplateService.installFocusModeForUser(focusModeTemplateDBResponseDummy.id, userDummy.id);

      expect(FocusModeRepositoryMock.orm.save).toHaveBeenCalledWith(
        new FocusMode({
          allowed_apps: [],
          allowed_urls: [],
          name: focusModeTemplateDBResponseDummy.name,
          focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
          user_id: userDummy.id,
          tags: expect.toBeArray(),
        }),
      );
    });

    it('Positive: if focus mode was installed before, update install record as currently installed', async () => {
      const installedRecord = new InstalledFocusModeTemplate({
        user_id: userDummy.id,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
        installation_status: false,
      });
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockResolvedValueOnce(installedRecord);

      await focusModeTemplateService.installFocusModeForUser(focusModeTemplateDBResponseDummy.id, userDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toHaveBeenCalledWith(installedRecord.id, {
        installation_status: true,
      });
    });

    it('Positive: if users first time installing focus mode template, create install record', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await focusModeTemplateService.installFocusModeForUser(focusModeTemplateDBResponseDummy.id, userDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.create).toHaveBeenCalledWith({
        user_id: userDummy.id,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
        installation_status: true,
      });
    });
  });

  describe('getMultipleFocusModeTemplates', () => {
    it('Negative: should return not found message for invalid user', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.installFocusModeForUser(randomUUID(), userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should call FocusModeTemplateRepository.fetchTemplatesByFilter with query params', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await focusModeTemplateService.getMultipleFocusModeTemplates({
        is_featured: true,
        marketplace_approval_status: true,
      });

      expect(FocusModeTemplatesRepositoryMock.fetchTemplatesByFilter).toHaveBeenCalledWith({
        is_featured: true,
        marketplace_approval_status: true,
      });
    });
  });

  describe('getUserInstalledTemplates', () => {
    it('Positive: should fetch user current installed focus mode templates using IDs from install logs', async () => {
      const installRecordDummyOne = { focus_mode_template_id: randomUUID() };
      const installRecordDummyTwo = { focus_mode_template_id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.find.mockResolvedValueOnce([
        installRecordDummyOne,
        installRecordDummyTwo,
      ]);

      await focusModeTemplateService.getUserInstalledTemplates(userDummy.id);

      expect(FocusModeTemplatesRepositoryMock.orm.find).toHaveBeenCalledWith({
        where: { id: In([installRecordDummyOne.focus_mode_template_id, installRecordDummyTwo.focus_mode_template_id]) },
      });
    });
  });
});
