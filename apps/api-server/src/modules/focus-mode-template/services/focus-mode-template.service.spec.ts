import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { ResponseMessage } from '../../../shared/domain/response-message.model';
import { focusModeTemplateDBResponseDummy, userDummy } from '../../../../test/dummies';
import {
  FocusModeRepositoryMock,
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

describe('FocusModeTemplatesService', () => {
  let focusModeTemplateService: FocusModeTemplatesService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeTemplatesService,
        FocusModeTemplatesRepository,
        UserRepository,
        FocusModeRepository,
        InstalledFocusModeTemplatesRepository,
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
      description: 'Text description',
      description_video_url: 'www.bah.com',
      welcome_message: 'Welcome message text',
      welcome_video_url: 'https:blah.io',
      marketplace_request: MarketplaceRequestType.requested,
      marketplace_approval_status: false,
      language: 'en',
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

    it('Positive: should call focusModeTemplateRepository.upsert with upsert dto and added properties', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);

      await focusModeTemplateService.upsertFocusModeTemplate(focusModeTemplateDtoDummy, userDummy.id);

      expect(FocusModeTemplatesRepositoryMock.upsert).toBeCalledWith(
        { ...focusModeTemplateDtoDummy, author_id: userDummy.id, author_name: userDummy.name },
        ['id'],
      );
    });

    it('Positive: admin user should be able to change marketplace approval status to true and update author name', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy, user_type: UserTypes.ADMIN });

      await focusModeTemplateService.upsertFocusModeTemplate(
        { ...focusModeTemplateDtoDummy, marketplace_approval_status: true, author_name: userDummy.name },
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.upsert).toBeCalledWith(
        new FocusModeTemplate({
          ...focusModeTemplateDtoDummy,
          author_id: userDummy.id,
          author_name: userDummy.name,
          marketplace_approval_status: true,
        }),
        ['id'],
      );
    });

    it('Positive: standard user should not be able to change marketplace approval status to true', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce({ ...userDummy });

      await focusModeTemplateService.upsertFocusModeTemplate(
        { ...focusModeTemplateDtoDummy, marketplace_approval_status: true },
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.upsert).toBeCalledWith(
        {
          ...focusModeTemplateDtoDummy,
          author_id: userDummy.id,
          author_name: userDummy.name,
        },
        ['id'],
      );
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

      expect(FocusModeTemplatesRepositoryMock.orm.softDelete).toBeCalledWith({
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

      expect(FocusModeRepositoryMock.create).toBeCalledWith({
        user_id: userDummy.id,
        name: focusModeTemplateDBResponseDummy.name,
        allowed_apps: focusModeTemplateDBResponseDummy.allowed_apps,
        allowed_urls: focusModeTemplateDBResponseDummy.allowed_urls,
        focus_mode_template_id: focusModeTemplateDBResponseDummy.id,
      });
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

      expect(InstalledFocusModeTemplatesRepositoryMock.orm.update).toBeCalledWith(installedRecord.id, {
        installation_status: true,
      });
    });

    it('Positive: if users first time installing focus mode template, create install record', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      FocusModeTemplatesRepositoryMock.orm.findOneBy.mockResolvedValueOnce(focusModeTemplateDBResponseDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.findOne.mockResolvedValueOnce(null);

      await focusModeTemplateService.installFocusModeForUser(focusModeTemplateDBResponseDummy.id, userDummy.id);

      expect(InstalledFocusModeTemplatesRepositoryMock.create).toBeCalledWith({
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

      await focusModeTemplateService.getMultipleFocusModeTemplates(
        { is_featured: true, marketplace_approval_status: true },
        userDummy.id,
      );

      expect(FocusModeTemplatesRepositoryMock.fetchTemplatesByFilter).toBeCalledWith({
        is_featured: true,
        marketplace_approval_status: true,
      });
    });
  });

  describe('getUserInstalledTemplates', () => {
    it('Negative: should return not found message if no user is returned from user repository', async () => {
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(null);
      const errorMessage = `User with ID: ${userDummy.id} does not exist!`;
      let exception: any;

      try {
        await focusModeTemplateService.getUserInstalledTemplates(userDummy.id);
      } catch (error) {
        exception = error;
      }

      expect(exception).toBeDefined();
      expect(exception).toBeInstanceOf(NotFoundException);
      expect(exception.message).toEqual(errorMessage);
    });

    it('Positive: should fetch user current installed focus mode templates using IDs from install logs', async () => {
      const installRecordDummyOne = { focus_mode_template_id: randomUUID() };
      const installRecordDummyTwo = { focus_mode_template_id: randomUUID() };
      UserRepositoryMock.orm.findOneBy.mockResolvedValueOnce(userDummy);
      InstalledFocusModeTemplatesRepositoryMock.orm.find.mockResolvedValueOnce([
        installRecordDummyOne,
        installRecordDummyTwo,
      ]);

      await focusModeTemplateService.getUserInstalledTemplates(userDummy.id);

      expect(FocusModeTemplatesRepositoryMock.orm.find).toBeCalledWith({
        where: { id: In([installRecordDummyOne.focus_mode_template_id, installRecordDummyTwo.focus_mode_template_id]) },
      });
    });
  });
});
