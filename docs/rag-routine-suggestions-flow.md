# Routine Suggestions RAG Flow

The routine suggestion feature now runs as an asynchronous job to keep the API fast while we execute the heavier RAG pipeline.

## Entry Points
- `POST /activity-library/routine-suggestions/async` returns an `asyncTaskId`, queues a Bull job (`routine-suggestions`) and immediately responds. The legacy synchronous endpoint still exists for backwards compatibility but is expected to call into the same service.
- The queued job is processed by `RoutineSuggestionsConsumer`, which calls `ActivityLibraryService.getActivitiesRelatedToUserGoals`, updates the async-task record, and notifies clients through `routine-suggestions.completed` Pusher events.

## RAG Pipeline (inside `ActivityLibraryService`)
1. **User verification & direct matches** – validate the user, try the existing goal/tag matching path, and exit early if we already have enough library habits.
2. **Embedding retrieval** – for each goal, `ActivityTemplateRetrieverService` requests an embedding from `ActivityTemplateGoalEmbeddingService`, then queries `ActivityTemplateEmbeddingRepository` (pgvector) for the top-N candidate templates (morning, evening, break, library).
3. **LLM scoring** – the candidates go to `RoutineSuggestionGeneratorService.generateSuggestions`, which uses the shared prompt cache (Promptfoo) to ask OpenAI for goal-aligned picks. Output is parsed into `{habitId, justification, matchScore}` metadata.
4. **Fallbacks** – if nothing clears the match threshold, we first attempt LLM-generated habits (`generateNewHabits`). If that still fails, we surface the highest-similarity templates with a “closest available” justification.
5. **Duration & type guardrails** – `userDesiredRoutineDurationSeconds` enforces routine-length limits (per routine type and overall), normalises names/descriptions, and attaches AI metadata (`ai_match_score`, `ai_justification`, `ai_goals`, `original_template_id`).
6. **Generated habit logging** – whenever we fall back to AI-created habits, `HabitLibraryRequestRepository.logRequests` saves them for later review together with the request context.

The final response either returns a flat list of habits or is grouped by goal (matching the legacy contract), with each habit carrying enough metadata for clients to display provenance and reasoning.
