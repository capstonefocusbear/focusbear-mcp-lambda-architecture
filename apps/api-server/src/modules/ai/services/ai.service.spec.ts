import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { FocusModeServiceMock, UserSettingsServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';
import { DaysOfWeek } from '../../activity/domain/days-of-week.enum';

describe('AiService', () => {
  let service: AiService;
  const mockConfigService = {
    get: jest.fn().mockImplementation(() => {
      return 'mockedkey';
    }),
  };
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AiService, UserSettingsService, FocusModeService, ConfigService],
    })
      .overrideProvider(UserSettingsService)
      .useValue(UserSettingsServiceMock)
      .overrideProvider(FocusModeService)
      .useValue(FocusModeServiceMock)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    service = moduleRef.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPostFunctionCallPrompt', () => {
    it('positive: if function creates an activity, prompt for activity should be returned', async () => {
      const response = service.getPostFunctionCallPrompt('createActivity', { name: 'Reading', routine: 'break' });

      expect(response).toMatch(
        'Send the user a message saying their activity named Reading has been saved to their break routine.',
      );
    });

    it('positive: if function creates a focus ode, prompt for focus mode should be returned', async () => {
      const response = service.getPostFunctionCallPrompt('createFocusMode', { name: 'Coding Time' });

      expect(response).toMatch('Send the user a message saying their focus mode named Coding Time has been saved.');
    });
  });

  describe('createActivity', () => {
    it('positive: function should be called to add activity to user settings', async () => {
      const activityDataDummy = {
        name: 'Test Activity',
        duration: 300,
        days_of_week: [DaysOfWeek.ALL],
        routine: 'break',
      };
      await service.createActivity(userDummy.id, activityDataDummy);

      expect(UserSettingsServiceMock.addActivityToRoutine).toBeCalledWith(userDummy.id, activityDataDummy);
    });
  });

  describe('createFocusMode', () => {
    it('positive: function should be called to save focus mode', async () => {
      const focusModeData = { name: 'Test Name', allowed_apps: ['chrome.exe'], allowed_urls: [] };

      await service.createFocusMode(userDummy.id, focusModeData);

      expect(FocusModeServiceMock.createFocusMode).toBeCalledWith(userDummy.id, {
        id: expect.toBeString(),
        name: focusModeData.name,
        allowed_apps: focusModeData.allowed_apps,
        allowed_urls: focusModeData.allowed_urls,
      });
    });
  });
});
