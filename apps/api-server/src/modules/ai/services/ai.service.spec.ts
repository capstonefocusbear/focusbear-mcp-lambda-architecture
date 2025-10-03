import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Stream } from 'stream';
import { ChatCompletionMessageParam } from 'openai/resources';
import { AiService } from './ai.service';
import { UserSettingsService } from '../../user/services/user-settings/user-settings.service';
import { FocusModeService } from '../../focus-mode/services/focus-mode/focus-mode.service';
import { FocusModeServiceMock, UserSettingsServiceMock } from '../../../../test/mocks';
import { userDummy } from '../../../../test/dummies';
import { DaysOfWeek } from '../../activity/domain/days-of-week.enum';
import { FunctionCallParametersDto } from '../dto/function-call-parameters.dto';

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

  afterEach(() => {
    jest.clearAllMocks();
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

  describe('validateFunctionCallParameters', () => {
    it('positive: returns void when DTO is valid', async () => {
      const validParams: FunctionCallParametersDto = {
        name: 'Valid Name',
        allowed_apps: [],
        allowed_urls: [],
      };

      await expect(service.validateFunctionCallParameters(validParams)).resolves.toBeUndefined();
    });

    it('negative: throws BadRequestException when validation fails', async () => {
      const invalidParams = { allowed_apps: ['chrome.exe'] } as FunctionCallParametersDto;

      await expect(service.validateFunctionCallParameters(invalidParams)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getChatHistory', () => {
    it('positive: prepends default system prompt while keeping existing messages', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as ChatCompletionMessageParam[];

      const response = service.getChatHistory(messages, 'Spanish');

      expect(response).toHaveLength(2);
      expect(response[0].role).toBe('system');
      expect(response[0].content).toContain('Spanish');
      expect(response[1]).toEqual(messages[0]);
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

  describe('handleStreamEnd', () => {
    const buildMockStream = () => {
      const stream = new Stream.PassThrough();
      jest.spyOn(stream, 'write');
      jest.spyOn(stream, 'end');
      return stream;
    };

    const buildAsyncIterable = (chunks: any[]) => ({
      [Symbol.asyncIterator]() {
        let index = 0;
        return {
          async next() {
            if (index < chunks.length) {
              const value = chunks[index];
              index += 1;
              return { value, done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    });

    it('positive: ends stream immediately when not in function call mode', async () => {
      const stream = buildMockStream();

      await service.handleStreamEnd(stream, '', '', false, userDummy.id, {
        chat: { completions: { create: jest.fn() } },
      } as any);

      expect(stream.write).not.toHaveBeenCalled();
      expect(stream.end).toHaveBeenCalledTimes(1);
    });

    it('positive: processes function call response and streams follow-up message', async () => {
      const stream = buildMockStream();
      const functionParameters = {
        name: 'Focus Session',
        allowed_apps: ['code'],
        allowed_urls: [],
      };
      const mockValidate = jest.spyOn(service, 'validateFunctionCallParameters').mockResolvedValue(undefined);
      const mockCreateActivity = jest.spyOn(service, 'createActivity').mockResolvedValue(undefined);
      const mockOpenAi = {
        chat: {
          completions: {
            create: jest
              .fn()
              .mockResolvedValue(
                buildAsyncIterable([
                  { choices: [{ finish_reason: null, delta: { content: 'Follow-up', function_call: null } }] },
                  { choices: [{ finish_reason: 'stop', delta: { content: '', function_call: null } }] },
                ]),
              ),
          },
        },
      };

      await service.handleStreamEnd(
        stream,
        'createActivity',
        JSON.stringify(functionParameters),
        true,
        userDummy.id,
        mockOpenAi as any,
      );

      expect(mockValidate).toHaveBeenCalledWith(functionParameters);
      expect(mockCreateActivity).toHaveBeenCalledWith(userDummy.id, functionParameters);
      expect(mockOpenAi.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(stream.write).toHaveBeenNthCalledWith(1, 'data: Follow-up\n\n');
      expect(stream.write).toHaveBeenNthCalledWith(2, 'data: [DONE]\n\n');
      expect(stream.end).toHaveBeenCalledTimes(1);
    });
  });
});
