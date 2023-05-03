import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { SENTRY_TOKEN } from '@ntegral/nestjs-sentry';
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
} from '../../../../../test/mocks';
import { UpdateFocusModeDto } from '../../dto/update-focus-mode.dto';
import { FocusModeRepository } from '../../repositories/focus-mode.repository';
import { FocusModeService } from './focus-mode.service';
import { InstalledFocusModeTemplatesRepository } from '../../../focus-mode-template/repositories/installed-focus-mode-templates.reporisoty';
import { InstalledFocusModeTemplate } from '../../../focus-mode-template/entities/installed-focus-mode_templates.entity';
import { FocusModeTagRepository } from '../../repositories/focus-mode-tags.repository';
import { CreateFocusModeDto } from '../../dto/create-focus-mode.dto';
import { FocusMode } from '../../entities/focus-mode.entity';

describe('FocusModeService', () => {
  let focusModeService: FocusModeService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FocusModeService,
        FocusModeRepository,
        InstalledFocusModeTemplatesRepository,
        FocusModeTagRepository,
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
      .compile();

    focusModeService = moduleRef.get<FocusModeService>(FocusModeService);
  });

  it('should be defined', () => {
    expect(focusModeService).toBeDefined();
  });

  describe('createFocusMode', () => {
    const createFocusModeDto: CreateFocusModeDto = {
      id: randomUUID(),
      name: 'some string',
      allowed_apps: ['chrome.exe'],
      allowed_urls: ['https://focusbear.io'],
      tags: [{ id: randomUUID(), text: 'Test Tag' }],
    };
    const user_id = userDummy.id;

    it('positive: repository create should be called', async () => {
      await focusModeService.createFocusMode(user_id, createFocusModeDto);

      expect(FocusModeRepositoryMock.orm.save).toBeCalledWith(
        new FocusMode({ ...createFocusModeDto, user_id, tags: expect.toBeArray() }),
      );
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

    it('positive: repository update should be called', async () => {
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
    it('positive: should call update on supplied user focus modes', async () => {
      FocusModeRepositoryMock.orm.find.mockResolvedValueOnce([FocusModeDummy]);

      await focusModeService.updateFocusModes(userDummy.id, [{ ...UpsertFocusModeDummy, id: FocusModeDummy.id }]);

      expect(FocusModeRepositoryMock.orm.save).toBeCalledWith({ ...FocusModeDummy });
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
});
