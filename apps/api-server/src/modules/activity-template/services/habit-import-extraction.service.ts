import { Injectable, Logger } from '@nestjs/common';
import { InjectSentry, SentryService } from '@app/observability';
import { In } from 'typeorm';
import { OpenAIService } from '@app/openai';
import { ActivityTemplateRetrieverService } from './activity-template-retriever.service';
import { RoutineSuggestionGeneratorService, RoutineSuggestionCandidate } from './routine-suggestion-generator.service';
import { ActivityTemplateRepository } from '../repository/activity-template.repository';
import {
  HabitLibraryRequestRepository,
  HabitLibraryRequestRecord,
} from '../repository/habit-library-request.repository';
import { ExtractedHabit, HabitImportRoutineType, HabitSuggestionResult } from '../dto/import-habits-from-media.dto';

const RAG_RETRIEVAL_LIMIT = 10;
const DEFAULT_MATCH_THRESHOLD = 0.5;
const CONCURRENT_MATCH_LIMIT = 7;

export interface MatchExtractedHabitsTelemetry {
  embeddingBatchCalls: number;
  ragRetrieveMs: number;
  ragTemplateFetchMs: number;
  ragRerankMs: number;
  rerankLlmCalls: number;
  rerankShortcutAccepts: number;
  rerankShortcutRejects: number;
}

export interface MatchExtractedHabitsWithTelemetryResult {
  results: HabitSuggestionResult[];
  telemetry: MatchExtractedHabitsTelemetry;
}

type HabitMatchTelemetryDelta = MatchExtractedHabitsTelemetry;

@Injectable()
export class HabitImportExtractionService {
  private readonly logger = new Logger(HabitImportExtractionService.name);

  constructor(
    private readonly openAIService: OpenAIService,
    private readonly activityTemplateRetrieverService: ActivityTemplateRetrieverService,
    private readonly routineSuggestionGeneratorService: RoutineSuggestionGeneratorService,
    private readonly activityTemplateRepository: ActivityTemplateRepository,
    private readonly habitLibraryRequestRepository: HabitLibraryRequestRepository,
    @InjectSentry() private readonly sentryService: SentryService,
  ) {}

  async extractHabitsFromImage(imageBuffer: string): Promise<ExtractedHabit[]> {
    try {
      return await this.openAIService.extractHabitsFromImage(imageBuffer);
    } catch (error) {
      this.logger.error(`Failed to extract habits from image: ${error.message}`, error.stack);
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async extractHabitsFromTranscript(transcript: string): Promise<ExtractedHabit[]> {
    try {
      return await this.openAIService.extractHabitsFromTranscript(transcript);
    } catch (error) {
      this.logger.error(`Failed to extract habits from transcript: ${error.message}`, error.stack);
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }

  async matchExtractedHabits(
    habits: ExtractedHabit[],
    options: {
      minMatchScore?: number;
      routineType?: string;
    } = {},
  ): Promise<HabitSuggestionResult[]> {
    const { results } = await this.matchExtractedHabitsWithTelemetry(habits, options);
    return results;
  }

  async matchExtractedHabitsWithTelemetry(
    habits: ExtractedHabit[],
    options: {
      minMatchScore?: number;
      routineType?: string;
    } = {},
  ): Promise<MatchExtractedHabitsWithTelemetryResult> {
    const minMatchScore = options.minMatchScore ?? DEFAULT_MATCH_THRESHOLD;
    const { routineType } = options;

    const telemetry = this.createEmptyTelemetry();
    const results: HabitSuggestionResult[] = [];
    for (let offset = 0; offset < habits.length; offset += CONCURRENT_MATCH_LIMIT) {
      const batch = habits.slice(offset, offset + CONCURRENT_MATCH_LIMIT);
      const searchQueries = batch.map((habit) => [habit.name, habit.description].filter(Boolean).join(' '));
      let matchesByHabit: Array<Array<{ activityTemplateId: string; similarity: number }>> = [];
      let retrievalFailed = false;
      try {
        const retrieveStartedAt = Date.now();
        // biome-ignore lint/performance/noAwaitInLoops: await in loops is required here
        matchesByHabit = await this.retrieveMatchesForBatch(searchQueries, routineType);
        telemetry.ragRetrieveMs += Date.now() - retrieveStartedAt;
        if (searchQueries.length > 0) {
          telemetry.embeddingBatchCalls += 1;
        }
      } catch (error) {
        const exception = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`HabitImport:batchRetrievalFailed: ${exception.message}`, exception.stack);
        this.sentryService.instance().captureException(exception, {
          level: 'warning',
          extra: {
            routineType,
            batchSize: batch.length,
          },
        });
        results.push(
          ...batch.map((habit) => ({
            extractedHabit: habit,
            matched: false,
            suggestedHabit: habit,
          })),
        );
        retrievalFailed = true;
      }

      if (!retrievalFailed) {
        const batchResults = await Promise.all(
          batch.map(async (habit, index) => {
            try {
              const { result, telemetryDelta } = await this.matchSingleHabitFromMatches(
                habit,
                matchesByHabit[index] ?? [],
                minMatchScore,
                routineType,
              );
              this.mergeTelemetry(telemetry, telemetryDelta);
              return result;
            } catch (error) {
              this.logger.error(`Failed to match habit "${habit.name}": ${error.message}`, error.stack);
              return {
                extractedHabit: habit,
                matched: false,
                suggestedHabit: habit,
              };
            }
          }),
        );
        results.push(...batchResults);
      }
    }
    return { results, telemetry };
  }

  private async matchSingleHabitFromMatches(
    habit: ExtractedHabit,
    matches: Array<{ activityTemplateId: string; similarity: number }>,
    minMatchScore: number,
    routineType?: string,
  ): Promise<{ result: HabitSuggestionResult; telemetryDelta: HabitMatchTelemetryDelta }> {
    const telemetryDelta = this.createEmptyTelemetry();

    // Build search query from habit name and description
    const searchQuery = [habit.name, habit.description].filter(Boolean).join(' ');

    this.logger.debug(
      `HabitImport:matchSingleHabit ${JSON.stringify({
        habitName: habit.name,
        searchQuery: searchQuery.substring(0, 100),
        routineType,
      })}`,
    );

    if (!matches.length) {
      // No candidates found - return extracted habit for manual addition
      this.logger.debug(`HabitImport:noMatches for "${habit.name}"`);
      return {
        result: {
          extractedHabit: habit,
          matched: false,
          suggestedHabit: habit,
        },
        telemetryDelta,
      };
    }

    // Fetch full templates for the matched IDs
    const matchedIds = matches.map((match) => match.activityTemplateId);
    const templateFetchStartedAt = Date.now();
    const matchedTemplates = await this.activityTemplateRepository.orm.find({
      where: { id: In(matchedIds) },
      relations: ['tags'],
    });
    telemetryDelta.ragTemplateFetchMs += Date.now() - templateFetchStartedAt;

    const templateMap = new Map(matchedTemplates.map((template) => [template.id, template]));

    // Build candidates for LLM evaluation
    const candidates: RoutineSuggestionCandidate[] = matches
      .map((match) => {
        const template = templateMap.get(match.activityTemplateId);
        if (!template) {
          return null;
        }
        return {
          template,
          similarity: match.similarity,
        };
      })
      .filter((candidate): candidate is RoutineSuggestionCandidate => !!candidate);

    if (!candidates.length) {
      return {
        result: {
          extractedHabit: habit,
          matched: false,
          suggestedHabit: habit,
        },
        telemetryDelta,
      };
    }

    // 2. LLM evaluation - evaluate candidates for semantic match
    const rerankStartedAt = Date.now();
    const { accepted, telemetry } = await this.routineSuggestionGeneratorService.generateSuggestions(
      habit.name,
      candidates,
      {
        limit: 1,
        minMatchScore,
        includeTelemetry: true,
      },
    );
    telemetryDelta.ragRerankMs += Date.now() - rerankStartedAt;
    if (telemetry?.llmInvoked) {
      telemetryDelta.rerankLlmCalls += 1;
    }
    if (telemetry?.shortcutAccepted) {
      telemetryDelta.rerankShortcutAccepts += 1;
    }
    if (telemetry?.shortcutRejected) {
      telemetryDelta.rerankShortcutRejects += 1;
    }

    if (!accepted.length) {
      // LLM rejected all candidates - return extracted habit
      this.logger.debug(`HabitImport:llmRejected all candidates for "${habit.name}"`);
      return {
        result: {
          extractedHabit: habit,
          matched: false,
          suggestedHabit: habit,
        },
        telemetryDelta,
      };
    }

    // Match found - return ActivityTemplate with LLM justification
    const bestMatch = accepted[0];
    this.logger.debug(
      `HabitImport:matched "${habit.name}" to template ${bestMatch.habitId} with score ${bestMatch.matchScore}`,
    );

    return {
      result: {
        extractedHabit: habit,
        matched: true,
        matchedTemplate: {
          id: bestMatch.habitId,
          name: bestMatch.name,
          description: bestMatch.description,
          activityType: bestMatch.template.activity_type,
          durationSeconds: bestMatch.template.duration_seconds,
          matchScore: bestMatch.matchScore,
          justification: bestMatch.justification,
          habitIcon: bestMatch.template.activity_data?.habit_icon,
        },
      },
      telemetryDelta,
    };
  }

  private async retrieveMatchesForBatch(
    searchQueries: string[],
    routineType?: string,
  ): Promise<Array<Array<{ activityTemplateId: string; similarity: number }>>> {
    return this.activityTemplateRetrieverService.retrieveByTexts(searchQueries, RAG_RETRIEVAL_LIMIT, { routineType });
  }

  private createEmptyTelemetry(): MatchExtractedHabitsTelemetry {
    return {
      embeddingBatchCalls: 0,
      ragRetrieveMs: 0,
      ragTemplateFetchMs: 0,
      ragRerankMs: 0,
      rerankLlmCalls: 0,
      rerankShortcutAccepts: 0,
      rerankShortcutRejects: 0,
    };
  }

  private mergeTelemetry(
    accumulator: MatchExtractedHabitsTelemetry,
    delta: HabitMatchTelemetryDelta,
  ): MatchExtractedHabitsTelemetry {
    accumulator.embeddingBatchCalls += delta.embeddingBatchCalls;
    accumulator.ragRetrieveMs += delta.ragRetrieveMs;
    accumulator.ragTemplateFetchMs += delta.ragTemplateFetchMs;
    accumulator.ragRerankMs += delta.ragRerankMs;
    accumulator.rerankLlmCalls += delta.rerankLlmCalls;
    accumulator.rerankShortcutAccepts += delta.rerankShortcutAccepts;
    accumulator.rerankShortcutRejects += delta.rerankShortcutRejects;
    return accumulator;
  }

  async logUnmatchedHabits(
    results: HabitSuggestionResult[],
    userId: string,
    metadata: {
      asyncTaskId: string;
      mediaType: 'image' | 'audio';
      routineType?: HabitImportRoutineType;
    },
  ): Promise<void> {
    const unmatchedHabits = results.filter((r) => !r.matched);

    if (!unmatchedHabits.length) {
      return;
    }

    const records: HabitLibraryRequestRecord[] = unmatchedHabits.map((result) => ({
      userId,
      goal: 'habit_import',
      habitName: result.extractedHabit.name,
      habitDescription: result.extractedHabit.description,
      routineType: this.resolveRoutineTypeForLogging(result.extractedHabit.routineType, metadata.routineType),
      durationMinutes: result.extractedHabit.estimatedDurationMinutes,
      justification: 'No matching habit in library - imported from user screenshot/audio',
      requestMetadata: {
        source: 'habit_import',
        mediaType: metadata.mediaType,
        asyncTaskId: metadata.asyncTaskId,
        extractedCategory: result.extractedHabit.category,
      },
    }));

    try {
      await this.habitLibraryRequestRepository.logRequests(records);
      this.logger.debug(`HabitImport:logged ${records.length} unmatched habits for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to log unmatched habits: ${error.message}`, error.stack);
      this.sentryService.instance().captureException(error, {
        level: 'warning',
        extra: { userId, unmatchedCount: records.length },
      });
      // Don't throw - logging failure shouldn't fail the whole import
    }
  }

  private resolveRoutineTypeForLogging(
    extractedRoutineType?: HabitImportRoutineType,
    requestRoutineType?: string,
  ): HabitImportRoutineType {
    const routineType = extractedRoutineType ?? this.normalizeRoutineType(requestRoutineType);
    return routineType ?? 'morning';
  }

  private normalizeRoutineType(routineType?: string): HabitImportRoutineType | undefined {
    if (!routineType) {
      return undefined;
    }

    const normalized = String(routineType).trim().toLowerCase();
    if (normalized === 'morning' || normalized === 'evening' || normalized === 'break') {
      return normalized;
    }

    return undefined;
  }
}
