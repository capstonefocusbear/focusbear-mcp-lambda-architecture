import { CompletedActivityMetadata } from './completed-activity.metadata';
import { isTruthyBooleanLike } from './completed-activity-metadata-coercion.utils';

/**
 * Legacy clients can still send `is_skipped`, while newer clients may send
 * `skipped_did_not_complete` or `skipped_did_complete`.
 * If flags conflict, `skipped_did_complete` wins to preserve existing behavior
 * where "already did it" counts as completion.
 */
export function isSkippedDidCompleteFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  return isTruthyBooleanLike(metadata?.skipped_did_complete);
}

export function isSkippedWithoutCompletionFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  if (isSkippedDidCompleteFromMetadata(metadata)) {
    return false;
  }

  return isTruthyBooleanLike(metadata?.is_skipped) || isTruthyBooleanLike(metadata?.skipped_did_not_complete);
}

export function countsAsCompletionFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  return isSkippedDidCompleteFromMetadata(metadata) || !isSkippedWithoutCompletionFromMetadata(metadata);
}
