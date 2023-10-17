import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { FocusModeServiceMock, UserSettingsServiceMock } from '../../../../test/mocks';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AiService, UserSettingsService, FocusModeService],
    })
      .overrideProvider(UserSettingsService)
      .useValue(UserSettingsServiceMock)
      .overrideProvider(FocusModeService)
      .useValue(FocusModeServiceMock)
      .compile();

    service = moduleRef.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
