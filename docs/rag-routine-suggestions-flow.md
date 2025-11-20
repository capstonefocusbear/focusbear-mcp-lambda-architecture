# RAG Routine Suggestions Flow (API Server)

This documents the production flow for `/activity-library/routine-suggestions` (sync + async). It mirrors the implementation in `ActivityLibraryService` and related services.

## Stages

1. **Direct tag match (fast path)**
   - Repository query: tags intersect user goals; activity_type in morning/evening; duration <= requested.
   - Sorted shortest-first, capped per type.
   - Returned immediately if non-empty.

2. **RAG retrieval + LLM re-rank**
   - For each goal: embed goal (`ActivityTemplateGoalEmbeddingService`), KNN search in `activity_template_embedding` (`ActivityTemplateEmbeddingRepository`).
   - Build candidate context (top N) and call LLM (`RoutineSuggestionGeneratorService.generateSuggestions`) using prompt cache (`routine-suggestions`).
   - Filter by min match score (default 0.5); attach AI metadata.

3. **AI generation fallback**
   - If LLM rejects all candidates or none found: generate new habits (`RoutineSuggestionGeneratorService.generateNewHabits`), using prompt cache key `routine-suggestions-generate` (fallback prompt inline).
   - Generated habits are logged to `habit_library_requests`.

4. **Similarity fallback (last resort)**
   - If LLM parsing/errors: return top embedding matches above threshold with a “closest available” justification.

5. **Duration + type balancing**
   - `userDesiredRoutineDurationSeconds` applies per-type caps (morning/evening/break/library) and routine duration budget.
   - Prevents break/library from crowding out morning/evening.

## Async path

- Endpoint: `POST /activity-library/routine-suggestions/async`
- Flow: enqueue Bull job (`routine-suggestions` queue) → consumer calls same service → updates async_task + Pusher event `routine-suggestions.completed`.

## Key files

- `apps/api-server/src/modules/activity-template/services/activity-library.service.ts`
- `apps/api-server/src/modules/activity-template/services/activity-template-retriever.service.ts`
- `apps/api-server/src/modules/activity-template/services/routine-suggestion-generator.service.ts`
- `apps/api-server/src/modules/activity-template/services/activity-template-embedding-sync.service.ts`
