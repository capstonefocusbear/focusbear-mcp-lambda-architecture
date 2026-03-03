/* eslint-disable no-console */
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { toFile } from 'openai/uploads';
import { OpenAIService } from '@app/openai';
import { R2Service } from '@app/r2';
import { AppModule } from '../../src/app.module';
import { HabitImportExtractionService } from '../../src/modules/activity-template/services/habit-import-extraction.service';
import { S3_BUCKET_HABIT_IMPORTS } from '../../src/shared/utils/constants';
import { audioTestCases, HabitImportTestCase, imageTestCases, TestResult } from '../fixtures/habit-import/test-cases';

/**
 * Habit Import RAG Pipeline E2E Tests
 *
 * These tests validate the full habit import pipeline including:
 * 1. Image extraction via OpenAI
 * 2. RAG matching against the habit library (vector search + LLM re-ranking)
 *
 * Prerequisites:
 * - Database with habit templates and embeddings
 * - OPENAI_API_KEY environment variable
 * - Test images hosted at accessible URLs
 *
 * Note: These tests make real API calls to OpenAI and are not suitable for CI.
 * Run manually for validation: npm run test:e2e:habit-import
 */

// Timeout for API calls (2 minutes per test)
const TEST_TIMEOUT = 120000;
// Longer timeout for app initialization (5 minutes)
const INIT_TIMEOUT = 300000;

const FUZZY_MATCH_STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'to',
  'of',
  'for',
  'in',
  'on',
  'at',
  'by',
  'with',
  'every',
  'each',
  'per',
  'daily',
  'day',
  'week',
  'weekly',
  'month',
  'monthly',
  'minute',
  'minutes',
  'min',
  'mins',
  'hour',
  'hours',
  'hr',
  'hrs',
]);

// Helper to escape CSV values
function escapeCSV(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function tokenizeForFuzzyMatch(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !FUZZY_MATCH_STOPWORDS.has(token));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) {
      intersection += 1;
    }
  });

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isFuzzyMatch(expected: string, actual: string): boolean {
  const expectedNormalized = expected
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const actualNormalized = actual
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (expectedNormalized.length === 0 || actualNormalized.length === 0) {
    return false;
  }

  if (actualNormalized.includes(expectedNormalized) || expectedNormalized.includes(actualNormalized)) {
    return true;
  }

  const expectedTokens = tokenizeForFuzzyMatch(expectedNormalized);
  const actualTokens = tokenizeForFuzzyMatch(actualNormalized);
  return jaccardSimilarity(expectedTokens, actualTokens) >= 0.5;
}

describe('Habit Import RAG Pipeline E2E', () => {
  let app: NestFastifyApplication;
  let habitImportExtractionService: HabitImportExtractionService;
  let openAIService: OpenAIService;
  let r2Service: R2Service;
  const testResults: TestResult[] = [];

  beforeAll(async () => {
    console.log('Initializing test module...');
    const startTime = Date.now();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    console.log(`  Module compiled in ${Date.now() - startTime}ms`);

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    habitImportExtractionService = moduleRef.get<HabitImportExtractionService>(HabitImportExtractionService);
    openAIService = moduleRef.get<OpenAIService>(OpenAIService);
    r2Service = moduleRef.get<R2Service>(R2Service);

    jest.setTimeout(TEST_TIMEOUT);
    await app.init();
    console.log(`  App initialized in ${Date.now() - startTime}ms`);

    await app.getHttpAdapter().getInstance().ready();
    console.log(`  Fastify ready in ${Date.now() - startTime}ms`);
  }, INIT_TIMEOUT);

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    // Write results to CSV
    if (testResults.length > 0) {
      const resultsDir = path.join(__dirname, '../results');
      await fs.mkdir(resultsDir, { recursive: true });

      const headers = [
        'Description',
        'URL',
        'Routine Type',
        'Passed',
        'Min Extracted',
        'Min Matched',
        'Expected Count',
        'Expected Matched Count',
        'Extracted Count',
        'Matched Count',
        'Image Fetch (ms)',
        'Extraction (ms)',
        'RAG Matching (ms)',
        'RAG Retrieve (ms)',
        'RAG Template Fetch (ms)',
        'RAG Rerank (ms)',
        'Total (ms)',
        'Extracted Habits',
        'Matched Habits',
        'Expected Unmatched Habits',
        'Unmatched Habits',
        'Errors',
      ];

      const rows = testResults.map((r) =>
        [
          escapeCSV(r.description),
          escapeCSV(r.url),
          escapeCSV(r.routineType || ''),
          escapeCSV(r.passed),
          escapeCSV(r.minExtracted),
          escapeCSV(r.minMatched),
          escapeCSV(r.expectedHabits.length),
          escapeCSV(r.expectedMatchedCount),
          escapeCSV(r.extractedCount),
          escapeCSV(r.matchedCount),
          escapeCSV(r.latency.imageFetchMs),
          escapeCSV(r.latency.extractionMs),
          escapeCSV(r.latency.ragMatchingMs),
          escapeCSV(r.latency.ragRetrieveMs),
          escapeCSV(r.latency.ragTemplateFetchMs),
          escapeCSV(r.latency.ragRerankMs),
          escapeCSV(r.latency.totalMs),
          escapeCSV(r.extractedHabits.join('; ')),
          escapeCSV(r.matchedHabits.map((m) => `${m.extracted} → ${m.matched} (${m.score.toFixed(2)})`).join('; ')),
          escapeCSV(r.expectedUnmatchedHabits.join('; ')),
          escapeCSV(r.unmatchedHabits.join('; ')),
          escapeCSV(r.errors.join('; ')),
        ].join(','),
      );

      const csv = [headers.join(','), ...rows].join('\n');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(resultsDir, `habit-import-${timestamp}.csv`);
      await fs.writeFile(filePath, csv);
      await fs.writeFile(path.join(resultsDir, 'habit-import-latest.csv'), csv);

      // Print summary
      const passed = testResults.filter((r) => r.passed).length;
      const avgTotal = Math.round(testResults.reduce((sum, r) => sum + r.latency.totalMs, 0) / testResults.length);
      console.log('\n========== RESULTS SUMMARY ==========');
      console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${testResults.length - passed}`);
      console.log(`Avg latency: ${avgTotal}ms`);
      console.log(`Results written to: ${filePath}`);
      console.log('=====================================');
    }
  }, TEST_TIMEOUT);

  /**
   * Resolve either direct URL or R2 media key to a downloadable URL.
   */
  async function resolveMediaUrl(testCase: HabitImportTestCase): Promise<string> {
    if (testCase.url) {
      return testCase.url;
    }
    if (testCase.mediaKey) {
      return r2Service.getPresignedUrl(S3_BUCKET_HABIT_IMPORTS, testCase.mediaKey);
    }
    throw new Error(`Test case "${testCase.description}" is missing both url and mediaKey`);
  }

  /**
   * Fetch media from URL as a binary buffer.
   */
  async function fetchMediaBuffer(url: string): Promise<{ buffer: Buffer; contentType?: string }> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] as string | undefined;
    return { buffer, contentType };
  }

  /**
   * Convert media buffer to base64 data URI (used for image extraction).
   */
  function toDataUri(buffer: Buffer, mediaType: 'image' | 'audio', contentType?: string): string {
    const base64 = buffer.toString('base64');
    const mimeType = contentType || (mediaType === 'image' ? 'image/png' : 'audio/mpeg');
    return `data:${mimeType};base64,${base64}`;
  }

  describe('Image Extraction + RAG Matching', () => {
    if (imageTestCases.length === 0) {
      it('has no image test cases defined', () => {
        console.log('No image test cases defined.');
      });
      return;
    }

    it.each(imageTestCases)(
      '$description',
      async (testCase) => {
        const mediaSource = testCase.url || `r2://${S3_BUCKET_HABIT_IMPORTS}/${testCase.mediaKey || 'unknown'}`;
        const result: TestResult = {
          description: testCase.description,
          url: mediaSource,
          routineType: testCase.routineType,
          passed: false,
          minExtracted: testCase.minExtracted,
          minMatched: testCase.minMatched,
          expectedHabits: testCase.expectedHabits,
          expectedMatchedHabits: [],
          expectedMatchedCount: 0,
          expectedUnmatchedHabits: [],
          extractedHabits: [],
          extractedCount: 0,
          matchedHabits: [],
          matchedCount: 0,
          unmatchedHabits: [],
          latency: {
            imageFetchMs: 0,
            extractionMs: 0,
            ragMatchingMs: 0,
            ragRetrieveMs: 0,
            ragTemplateFetchMs: 0,
            ragRerankMs: 0,
            totalMs: 0,
          },
          errors: [],
        };

        const totalStart = Date.now();

        try {
          // 1. Fetch image
          console.log(`\nTesting: ${testCase.description}`);
          const fetchStart = Date.now();
          const mediaUrl = await resolveMediaUrl(testCase);
          const { buffer, contentType } = await fetchMediaBuffer(mediaUrl);
          const imageDataUri = toDataUri(buffer, 'image', contentType);
          result.latency.imageFetchMs = Date.now() - fetchStart;
          console.log(`  Image fetched (${result.latency.imageFetchMs}ms)`);

          // 2. Extract habits
          const extractStart = Date.now();
          const extractedHabits = await habitImportExtractionService.extractHabitsFromImage(imageDataUri);
          result.latency.extractionMs = Date.now() - extractStart;
          result.extractedHabits = extractedHabits.map((h) => h.name);
          result.extractedCount = extractedHabits.length;
          console.log(`  Extracted ${result.extractedCount} habits (${result.latency.extractionMs}ms)`);

          // 2.5 Fuzzy-check expected habits coverage (informational)
          result.expectedMatchedHabits = testCase.expectedHabits.filter((expected) =>
            result.extractedHabits.some((actual) => isFuzzyMatch(expected, actual)),
          );
          result.expectedMatchedCount = result.expectedMatchedHabits.length;
          result.expectedUnmatchedHabits = testCase.expectedHabits.filter(
            (expected) => !result.expectedMatchedHabits.includes(expected),
          );
          console.log(
            `  Expected coverage: ${result.expectedMatchedCount}/${testCase.expectedHabits.length} matched (fuzzy)`,
          );

          // 3. RAG matching
          const ragStart = Date.now();
          const { results: matchResults, telemetry } =
            await habitImportExtractionService.matchExtractedHabitsWithTelemetry(extractedHabits, {
              routineType: testCase.routineType,
            });
          result.latency.ragMatchingMs = Date.now() - ragStart;
          result.latency.ragRetrieveMs = telemetry.ragRetrieveMs;
          result.latency.ragTemplateFetchMs = telemetry.ragTemplateFetchMs;
          result.latency.ragRerankMs = telemetry.ragRerankMs;

          // Collect match data
          result.matchedHabits = matchResults
            .filter((r) => r.matched && r.matchedTemplate)
            .map((r) => ({
              extracted: r.extractedHabit.name,
              matched: r.matchedTemplate?.name || '',
              score: r.matchedTemplate?.matchScore || 0,
            }));
          result.matchedCount = result.matchedHabits.length;
          result.unmatchedHabits = matchResults.filter((r) => !r.matched).map((r) => r.extractedHabit.name);

          console.log(
            `  RAG: ${result.matchedCount} matched, ${result.unmatchedHabits.length} unmatched (${result.latency.ragMatchingMs}ms)`,
          );

          // Log detailed matches
          matchResults.forEach((r, i) => {
            if (r.matched && r.matchedTemplate) {
              console.log(
                `    ${i + 1}. "${r.extractedHabit.name}" → "${
                  r.matchedTemplate.name
                }" (${r.matchedTemplate.matchScore?.toFixed(2)})`,
              );
            } else {
              console.log(`    ${i + 1}. "${r.extractedHabit.name}" → UNMATCHED`);
            }
          });

          const extractedOk = result.extractedCount >= testCase.minExtracted;
          const matchedOk = result.matchedCount >= testCase.minMatched;
          result.passed = extractedOk && matchedOk;
        } catch (error) {
          result.errors.push((error as Error).message);
          console.log(`  ERROR: ${(error as Error).message}`);
        }

        result.latency.totalMs = Date.now() - totalStart;
        testResults.push(result);

        console.log(`  Total time: ${result.latency.totalMs}ms | Passed: ${result.passed}`);
        expect(result.passed).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });

  describe('Audio Transcription + RAG Matching', () => {
    if (audioTestCases.length === 0) {
      it('has no audio test cases defined', () => {
        console.log('No audio test cases defined.');
      });
      return;
    }

    it.each(audioTestCases)(
      '$description',
      async (testCase) => {
        const mediaSource = testCase.url || `r2://${S3_BUCKET_HABIT_IMPORTS}/${testCase.mediaKey || 'unknown'}`;
        const result: TestResult = {
          description: testCase.description,
          url: mediaSource,
          routineType: testCase.routineType,
          passed: false,
          minExtracted: testCase.minExtracted,
          minMatched: testCase.minMatched,
          expectedHabits: testCase.expectedHabits,
          expectedMatchedHabits: [],
          expectedMatchedCount: 0,
          expectedUnmatchedHabits: [],
          extractedHabits: [],
          extractedCount: 0,
          matchedHabits: [],
          matchedCount: 0,
          unmatchedHabits: [],
          latency: {
            imageFetchMs: 0,
            extractionMs: 0,
            ragMatchingMs: 0,
            ragRetrieveMs: 0,
            ragTemplateFetchMs: 0,
            ragRerankMs: 0,
            totalMs: 0,
          },
          errors: [],
        };

        const totalStart = Date.now();

        try {
          console.log(`\nTesting: ${testCase.description}`);

          // 1. Fetch audio
          const fetchStart = Date.now();
          const mediaUrl = await resolveMediaUrl(testCase);
          const { buffer } = await fetchMediaBuffer(mediaUrl);
          result.latency.imageFetchMs = Date.now() - fetchStart;
          console.log(`  Audio fetched (${result.latency.imageFetchMs}ms)`);

          // 2. Transcribe + extract habits from transcript
          const extractStart = Date.now();
          const rawExt = path.extname(testCase.mediaKey || mediaUrl).toLowerCase();
          const allowed = new Set(['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm']);
          const safeExt = allowed.has(rawExt) ? rawExt : '.mp3';
          const audioFile = await toFile(buffer, `habit-import-e2e${safeExt}`);
          const transcript = await openAIService.transcribeAudioToText(audioFile as unknown as File);
          if (!transcript || transcript.trim().length === 0) {
            throw new Error('Empty transcript from audio');
          }
          const extractedHabits = await habitImportExtractionService.extractHabitsFromTranscript(transcript);
          result.latency.extractionMs = Date.now() - extractStart;
          result.extractedHabits = extractedHabits.map((h) => h.name);
          result.extractedCount = extractedHabits.length;
          console.log(`  Extracted ${result.extractedCount} habits (${result.latency.extractionMs}ms)`);

          // 2.5 Fuzzy-check expected habits coverage (informational)
          result.expectedMatchedHabits = testCase.expectedHabits.filter((expected) =>
            result.extractedHabits.some((actual) => isFuzzyMatch(expected, actual)),
          );
          result.expectedMatchedCount = result.expectedMatchedHabits.length;
          result.expectedUnmatchedHabits = testCase.expectedHabits.filter(
            (expected) => !result.expectedMatchedHabits.includes(expected),
          );
          console.log(
            `  Expected coverage: ${result.expectedMatchedCount}/${testCase.expectedHabits.length} matched (fuzzy)`,
          );

          // 3. RAG matching
          const ragStart = Date.now();
          const { results: matchResults, telemetry } =
            await habitImportExtractionService.matchExtractedHabitsWithTelemetry(extractedHabits, {
              routineType: testCase.routineType,
            });
          result.latency.ragMatchingMs = Date.now() - ragStart;
          result.latency.ragRetrieveMs = telemetry.ragRetrieveMs;
          result.latency.ragTemplateFetchMs = telemetry.ragTemplateFetchMs;
          result.latency.ragRerankMs = telemetry.ragRerankMs;

          // Collect match data
          result.matchedHabits = matchResults
            .filter((r) => r.matched && r.matchedTemplate)
            .map((r) => ({
              extracted: r.extractedHabit.name,
              matched: r.matchedTemplate?.name || '',
              score: r.matchedTemplate?.matchScore || 0,
            }));
          result.matchedCount = result.matchedHabits.length;
          result.unmatchedHabits = matchResults.filter((r) => !r.matched).map((r) => r.extractedHabit.name);

          console.log(
            `  RAG: ${result.matchedCount} matched, ${result.unmatchedHabits.length} unmatched (${result.latency.ragMatchingMs}ms)`,
          );

          const extractedOk = result.extractedCount >= testCase.minExtracted;
          const matchedOk = result.matchedCount >= testCase.minMatched;
          result.passed = extractedOk && matchedOk;
        } catch (error) {
          result.errors.push((error as Error).message);
          console.log(`  ERROR: ${(error as Error).message}`);
        }

        result.latency.totalMs = Date.now() - totalStart;
        testResults.push(result);

        console.log(`  Total time: ${result.latency.totalMs}ms | Passed: ${result.passed}`);
        expect(result.passed).toBe(true);
      },
      TEST_TIMEOUT,
    );
  });
});
