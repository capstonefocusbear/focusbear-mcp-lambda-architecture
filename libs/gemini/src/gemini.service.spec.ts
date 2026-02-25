import { Test, TestingModule } from '@nestjs/testing';
import { SENTRY_TOKEN } from '@app/observability';
import { promises as fs } from 'fs';
import { join } from 'path';
import { GeminiService } from './gemini.service';
import { GEMINI_MODULE_OPTIONS, GEMINI_PROMPT_CONFIG_PATH } from './gemini.constants';

// Mock implementation for GoogleGenAI
const googleGenAIServiceMock = {
  models: {
    generateContent: jest.fn(),
  },
};

// Mock the @google/genai module
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => googleGenAIServiceMock),
}));

// Define a type for the result for clarity and type safety
type UsageResult = Record<
  string,
  [
    {
      sourceName: string;
      minutesUsedTotal: number;
      category: string;
    },
  ]
>;

describe('GeminiService', () => {
  let service: GeminiService;
  let sentryInstanceMock;

  beforeEach(async () => {
    // Create a fresh mock for each test to avoid state leakage
    sentryInstanceMock = {
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: GEMINI_MODULE_OPTIONS,
          useValue: { apiKey: 'test-key' },
        },
        {
          provide: SENTRY_TOKEN,
          useValue: {
            instance: () => sentryInstanceMock,
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processUsageImage', () => {
    const mockImageBuffer = 'mock-image-buffer';
    const mockPrompt = 'Analyze this image.';
    const mockApiResponse = {
      text: '```json\n{"Chrome": [{"sourceName": "chrome.exe", "minutesUsedTotal": 120, "category": "Work"}]}\n```',
    };
    const expectedParsedJson: UsageResult = {
      Chrome: [{ sourceName: 'chrome.exe', minutesUsedTotal: 120, category: 'Work' }],
    };

    it('should process an image and return parsed JSON when the API call is successful', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify([{ content: [{ text: mockPrompt }] }]));
      googleGenAIServiceMock.models.generateContent.mockResolvedValue(mockApiResponse);

      const result = await service.processUsageImage(mockImageBuffer);

      expect(result).toEqual(expectedParsedJson);
      expect(fs.readFile).toHaveBeenCalledWith(GEMINI_PROMPT_CONFIG_PATH, 'utf8');
      expect(googleGenAIServiceMock.models.generateContent).toHaveBeenCalled();
      expect(sentryInstanceMock.addBreadcrumb).toHaveBeenCalledWith({
        category: 'Service',
        level: 'debug',
        message: 'Processing usage image with Gemini API',
      });
    });

    it('should throw an error and log to Sentry if the API call fails', async () => {
      const apiError = new Error('API down');
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify([{ content: [{ text: mockPrompt }] }]));
      googleGenAIServiceMock.models.generateContent.mockRejectedValue(apiError);

      await expect(service.processUsageImage(mockImageBuffer)).rejects.toThrow(
        'Failed to process usage image with Gemini',
      );
      expect(sentryInstanceMock.captureException).toHaveBeenCalledWith(apiError, { level: 'error' });
    });

    it('should throw an error and log to Sentry if getPrompt fails', async () => {
      const readFileError = new Error('File not found');
      jest.spyOn(fs, 'readFile').mockRejectedValue(readFileError);

      await expect(service.processUsageImage(mockImageBuffer)).rejects.toThrow(
        'Failed to process usage image with Gemini',
      );
      expect(sentryInstanceMock.captureException).toHaveBeenCalledWith(readFileError, {
        extra: { message: 'Failed to load Gemini prompt', configPath: GEMINI_PROMPT_CONFIG_PATH },
      });
    });

    it('should throw an error and log to Sentry if JSON parsing fails', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValueOnce(JSON.stringify([{ content: [{ text: mockPrompt }] }]));
      googleGenAIServiceMock.models.generateContent.mockResolvedValue({ text: 'this is not json' });
      await expect(service.processUsageImage(mockImageBuffer)).rejects.toThrow(
        'Failed to process usage image with Gemini',
      );
      expect(sentryInstanceMock.captureException).toHaveBeenCalled();
    });

    it('should fall back to dist prompt path when source prompt path is missing', async () => {
      const notFoundError = new Error('File not found') as NodeJS.ErrnoException;
      notFoundError.code = 'ENOENT';

      jest
        .spyOn(fs, 'readFile')
        .mockRejectedValueOnce(notFoundError)
        .mockResolvedValueOnce(JSON.stringify([{ content: [{ text: mockPrompt }] }]));
      googleGenAIServiceMock.models.generateContent.mockResolvedValue(mockApiResponse);

      const result = await service.processUsageImage(mockImageBuffer);

      expect(result).toEqual(expectedParsedJson);
      expect(fs.readFile).toHaveBeenNthCalledWith(1, GEMINI_PROMPT_CONFIG_PATH, 'utf8');
      expect(fs.readFile).toHaveBeenNthCalledWith(2, join('dist', GEMINI_PROMPT_CONFIG_PATH), 'utf8');
    });
  });

  describe('crossCheckWithGPT', () => {
    const mockImageBuffer = 'mock-image-buffer';
    const gptResult: UsageResult = {
      'app.exe': [{ sourceName: 'app.exe', minutesUsedTotal: 60, category: 'Productivity' }],
    };

    it('should return modelsAgree: true when results are similar', async () => {
      const geminiResult: UsageResult = {
        'app.exe': [{ sourceName: 'app.exe', minutesUsedTotal: 62, category: 'Productivity' }],
      };
      jest.spyOn(service, 'processUsageImage').mockResolvedValue(geminiResult);

      const result = await service.crossCheckWithGPT(mockImageBuffer, gptResult);

      expect(result.modelsAgree).toBe(true);
      expect(result.geminiResult).toEqual(geminiResult);
      expect(sentryInstanceMock.captureMessage).not.toHaveBeenCalled();
    });

    it('should return modelsAgree: false with details when results disagree', async () => {
      const geminiResult: UsageResult = {
        'app.exe': [{ sourceName: 'app.exe', minutesUsedTotal: 90, category: 'Entertainment' }],
      };
      jest.spyOn(service, 'processUsageImage').mockResolvedValue(geminiResult);

      const result = await service.crossCheckWithGPT(mockImageBuffer, gptResult);

      expect(result.modelsAgree).toBe(false);
      expect(result.disagreementDetails).toBeDefined();
      expect(result.disagreementDetails?.differences).toContain(
        'app.exe: Different categories - GPT: "Productivity", Gemini: "Entertainment"',
      );
      expect(sentryInstanceMock.captureMessage).toHaveBeenCalled();
    });

    it('should throw an error if processUsageImage fails during the cross-check', async () => {
      const processImageError = new Error('Processing failed');
      jest.spyOn(service, 'processUsageImage').mockRejectedValue(processImageError);

      await expect(service.crossCheckWithGPT(mockImageBuffer, gptResult)).rejects.toThrow(
        'Failed to cross-check results with Gemini',
      );
      expect(sentryInstanceMock.captureException).toHaveBeenCalledWith(processImageError, {
        level: 'error',
      });
    });
  });

  describe('compareResults (private method)', () => {
    const baseResult: UsageResult = {
      AppA: [{ sourceName: 'AppA.exe', minutesUsedTotal: 10, category: 'Work' }],
      AppB: [{ sourceName: 'AppB.exe', minutesUsedTotal: 20, category: 'Social' }],
    };

    it('should return true for identical results', () => {
      const identicalResult: UsageResult = JSON.parse(JSON.stringify(baseResult));
      expect((service as any).compareResults(baseResult, identicalResult)).toBe(true);
    });

    it('should return true for results with time within tolerance', () => {
      const tolerantResult: UsageResult = {
        AppA: [{ sourceName: 'AppA.exe', minutesUsedTotal: 14, category: 'Work' }],
        AppB: [{ sourceName: 'AppB.exe', minutesUsedTotal: 18, category: 'Social' }],
      };
      expect((service as any).compareResults(baseResult, tolerantResult)).toBe(true);
    });

    it('should return false for different app counts', () => {
      const differentCountResult: UsageResult = {
        AppA: [{ sourceName: 'AppA.exe', minutesUsedTotal: 10, category: 'Work' }],
      };
      expect((service as any).compareResults(baseResult, differentCountResult)).toBe(false);
    });

    it('should return false for different app names', () => {
      const differentNameResult: UsageResult = {
        AppC: [{ sourceName: 'AppC.exe', minutesUsedTotal: 10, category: 'Work' }],
        AppB: [{ sourceName: 'AppB.exe', minutesUsedTotal: 20, category: 'Social' }],
      };
      expect((service as any).compareResults(baseResult, differentNameResult)).toBe(false);
    });

    it('should return false for different categories', () => {
      const differentCategoryResult: UsageResult = {
        AppA: [{ sourceName: 'AppA.exe', minutesUsedTotal: 10, category: 'Entertainment' }],
        AppB: [{ sourceName: 'AppB.exe', minutesUsedTotal: 20, category: 'Social' }],
      };
      expect((service as any).compareResults(baseResult, differentCategoryResult)).toBe(false);
    });

    it('should return false for time difference outside tolerance', () => {
      const differentTimeResult: UsageResult = {
        AppA: [{ sourceName: 'AppA.exe', minutesUsedTotal: 10, category: 'Work' }],
        AppB: [{ sourceName: 'AppB.exe', minutesUsedTotal: 30, category: 'Social' }],
      };
      expect((service as any).compareResults(baseResult, differentTimeResult)).toBe(false);
    });
  });

  describe('analyzeDisagreement (private method)', () => {
    it('should report different app counts', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 1, category: 'C' }] };
      const gemini: UsageResult = {
        AppA: [{ sourceName: 'A', minutesUsedTotal: 1, category: 'C' }],
        AppB: [{ sourceName: 'B', minutesUsedTotal: 2, category: 'D' }],
      };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('Different number of apps detected: GPT found 1, Gemini found 2');
    });

    it('should report apps missing in Gemini', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 1, category: 'C' }] };
      const gemini: UsageResult = { AppB: [{ sourceName: 'B', minutesUsedTotal: 2, category: 'D' }] };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('Apps detected by GPT but not Gemini: AppA');
    });

    it('should report apps missing in GPT', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 1, category: 'C' }] };
      const gemini: UsageResult = {
        AppA: [{ sourceName: 'A', minutesUsedTotal: 1, category: 'C' }],
        AppB: [{ sourceName: 'B', minutesUsedTotal: 2, category: 'D' }],
      };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('Apps detected by Gemini but not GPT: AppB');
    });

    it('should report different source names', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A.v1', minutesUsedTotal: 10, category: 'Work' }] };
      const gemini: UsageResult = { AppA: [{ sourceName: 'A.v2', minutesUsedTotal: 10, category: 'Work' }] };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('AppA: Different source names - GPT: "A.v1", Gemini: "A.v2"');
    });

    it('should report different categories', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 10, category: 'Work' }] };
      const gemini: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 10, category: 'Games' }] };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('AppA: Different categories - GPT: "Work", Gemini: "Games"');
    });

    it('should report significant time differences', () => {
      const gpt: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 10, category: 'Work' }] };
      const gemini: UsageResult = { AppA: [{ sourceName: 'A', minutesUsedTotal: 20, category: 'Work' }] };
      const result = (service as any).analyzeDisagreement(gpt, gemini);
      expect(result.differences).toContain('AppA: Significant time difference - GPT: 10min, Gemini: 20min');
    });
  });
});
