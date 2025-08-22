import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs/promises';
import { EmailTemplateCompilerService } from './email-template-compiler.service';

jest.mock('fs/promises');
jest.mock('mjml', () => jest.fn());

const mockFs = fs as jest.Mocked<typeof fs>;
// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const mockMjml = require('mjml') as jest.MockedFunction<any>;

describe('EmailTemplateCompilerService', () => {
  let service: EmailTemplateCompilerService;

  const mockTemplateData = {
    userName: 'Test User',
    headerTitle: 'Weekly Progress Report',
    headerSubtitle: 'Your Focus Bear Performance',
    footerText: 'Keep up the great work! 🎉',
    unsubscribeText: 'Unsubscribe from these emails',
    apiUrl: 'https://api.focusbear.io',
    dashboardUrl: 'https://app.focusbear.io',
    unsubscribeToken: 'test-token',
    manageEmailPreferencesLink: 'https://api.focusbear.io/user/email-preferences',
    focusUsagePercentage: 75,
    lastActiveDate: '2025-08-19',
    morningRoutineUsage: 80,
    eveningRoutineUsage: 70,
    focusModeUsage: 85,
    microBreaksUsage: 60,
    morningRoutineStreak: 5,
    eveningRoutineStreak: 3,
    focusModeStreak: 7,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailTemplateCompilerService],
    }).compile();

    service = module.get<EmailTemplateCompilerService>(EmailTemplateCompilerService);

    mockMjml.mockReturnValue({
      html: '<html><body>Test HTML</body></html>',
      errors: [],
      json: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compileProgressEmail', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue(['metric-card.hbs', 'cta-button.hbs'] as any);
      mockFs.readFile
        .mockResolvedValueOnce('{{> metric-card}}') // partial
        .mockResolvedValueOnce('{{> cta-button}}') // partial
        .mockResolvedValueOnce('<mj-section><mj-column><mj-text>{{userName}}</mj-text></mj-column></mj-section>') // template
        .mockResolvedValueOnce('<mjml><mj-head></mj-head><mj-body>{{{content}}}</mj-body></mjml>'); // layout
    });

    it('should compile weekly progress email in English', async () => {
      const result = await service.compileProgressEmail('weekly-progress', mockTemplateData);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(result.subject).toContain('Weekly Progress Report');
      expect(result.html).toContain('Test HTML');
    });

    it('should compile no-progress email', async () => {
      const result = await service.compileProgressEmail('no-progress', mockTemplateData);

      expect(result.subject).toContain('miss you');
      expect(result.html).toContain('Test HTML');
    });

    it('should throw error when MJML compilation has errors', async () => {
      mockMjml.mockReturnValue({
        html: '<html><body>Test HTML</body></html>',
        errors: [
          {
            line: 1,
            message: 'Test warning',
            tagName: 'mj-test',
            formattedMessage: 'Line 1 (mj-test): Test warning',
          },
        ],
        json: null,
      });

      await expect(service.compileProgressEmail('weekly-progress', mockTemplateData)).rejects.toThrow(
        'Email template compilation failed',
      );
    });

    it('should throw error when template compilation fails', async () => {
      // Clear all previous mocks and set up fresh ones
      mockFs.readdir.mockReset();
      mockFs.readFile.mockReset();

      mockFs.readdir.mockResolvedValue(['metric-card.hbs', 'cta-button.hbs'] as any);
      mockFs.readFile
        .mockResolvedValueOnce('{{> metric-card}}') // partial
        .mockResolvedValueOnce('{{> cta-button}}') // partial
        .mockRejectedValueOnce(new Error('File not found')); // template read fails

      await expect(service.compileProgressEmail('weekly-progress', mockTemplateData)).rejects.toThrow(
        'Email template compilation failed',
      );
    });
  });

  describe('Handlebars helpers', () => {
    it('should register concat helper', async () => {
      // Clear all previous mocks and set up fresh ones
      mockFs.readdir.mockReset();
      mockFs.readFile.mockReset();

      mockFs.readdir.mockResolvedValue([]);
      mockFs.readFile
        .mockResolvedValueOnce('<mj-section><mj-column>{{concat "Hello " "World"}}</mj-column></mj-section>') // template
        .mockResolvedValueOnce('<mjml><mj-head></mj-head><mj-body>{{{content}}}</mj-body></mjml>'); // layout

      mockMjml.mockReturnValue({
        html: '<html><body>Test HTML</body></html>',
        errors: [],
        json: null,
      });

      await service.compileProgressEmail('weekly-progress', mockTemplateData);

      expect(mockMjml).toHaveBeenCalled();
    });

    it('should register round helper', async () => {
      mockFs.readdir.mockResolvedValue([]);
      mockFs.readFile
        .mockResolvedValueOnce('<mj-section><mj-column>{{round 0.75}}</mj-column></mj-section>')
        .mockResolvedValueOnce('<mjml><mj-head></mj-head><mj-body>{{{content}}}</mj-body></mjml>');

      await service.compileProgressEmail('weekly-progress', mockTemplateData);

      expect(mockMjml).toHaveBeenCalled();
    });
  });
});
