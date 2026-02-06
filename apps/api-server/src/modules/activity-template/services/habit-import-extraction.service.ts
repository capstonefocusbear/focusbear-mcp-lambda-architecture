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
import { ExtractedHabit, HabitSuggestionResult } from '../dto/import-habits-from-media.dto';

const RAG_RETRIEVAL_LIMIT = 10;
const DEFAULT_MATCH_THRESHOLD = 0.5;
const CONCURRENT_MATCH_LIMIT = 3;

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
    const minMatchScore = options.minMatchScore ?? DEFAULT_MATCH_THRESHOLD;
    const { routineType } = options;

    const results: HabitSuggestionResult[] = [];
    for (let offset = 0; offset < habits.length; offset += CONCURRENT_MATCH_LIMIT) {
      const batch = habits.slice(offset, offset + CONCURRENT_MATCH_LIMIT);
      // eslint-disable-next-line no-await-in-loop
      const batchResults = await Promise.all(
        batch.map(async (habit) => {
          try {
            return await this.matchSingleHabit(habit, minMatchScore, routineType);
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
    return results;
  }

  private async matchSingleHabit(
    habit: ExtractedHabit,
    minMatchScore: number,
    routineType?: string,
  ): Promise<HabitSuggestionResult> {
    // Build search query from habit name and description
    const searchQuery = [habit.name, habit.description].filter(Boolean).join(' ');

    this.logger.debug(
      `HabitImport:matchSingleHabit ${JSON.stringify({
        habitName: habit.name,
        searchQuery: searchQuery.substring(0, 100),
        routineType,
      })}`,
    );

    // 1. RAG retrieval - get candidate matches (filtered by routine type if provided)
    const matches = await this.activityTemplateRetrieverService.retrieveByText(searchQuery, RAG_RETRIEVAL_LIMIT, {
      routineType,
    });

    if (!matches.length) {
      // No candidates found - return extracted habit for manual addition
      this.logger.debug(`HabitImport:noMatches for "${habit.name}"`);
      return {
        extractedHabit: habit,
        matched: false,
        suggestedHabit: habit,
      };
    }

    // Fetch full templates for the matched IDs
    const matchedIds = matches.map((match) => match.activityTemplateId);
    const matchedTemplates = await this.activityTemplateRepository.orm.find({
      where: { id: In(matchedIds) },
      relations: ['tags'],
    });

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
        extractedHabit: habit,
        matched: false,
        suggestedHabit: habit,
      };
    }

    // 2. LLM evaluation - evaluate candidates for semantic match
    const { accepted } = await this.routineSuggestionGeneratorService.generateSuggestions(habit.name, candidates, {
      limit: 1,
      minMatchScore,
    });

    if (!accepted.length) {
      // LLM rejected all candidates - return extracted habit
      this.logger.debug(`HabitImport:llmRejected all candidates for "${habit.name}"`);
      return {
        extractedHabit: habit,
        matched: false,
        suggestedHabit: habit,
      };
    }

    // Match found - return ActivityTemplate with LLM justification
    const bestMatch = accepted[0];
    this.logger.debug(
      `HabitImport:matched "${habit.name}" to template ${bestMatch.habitId} with score ${bestMatch.matchScore}`,
    );

    return {
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
      },
    };
  }

  async logUnmatchedHabits(
    results: HabitSuggestionResult[],
    userId: string,
    metadata: {
      asyncTaskId: string;
      mediaType: 'image' | 'audio';
      routineType?: string;
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
      routineType: metadata.routineType || 'morning',
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
}
