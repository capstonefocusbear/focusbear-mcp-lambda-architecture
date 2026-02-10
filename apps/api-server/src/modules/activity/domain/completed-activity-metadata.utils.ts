import { CompletedActivityMetadata } from './completed-activity.metadata';

/**
 * Legacy clients can still send `is_skipped`, while newer clients may send
 * `skipped_did_not_complete` or `skipped_did_complete`.
 * If flags conflict, `skipped_did_complete` wins to preserve existing behavior
 * where "already did it" counts as completion.
 */
export function isSkippedDidCompleteFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  return metadata?.skipped_did_complete === true;
}

export function isSkippedWithoutCompletionFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  if (isSkippedDidCompleteFromMetadata(metadata)) {
    return false;
  }

  return metadata?.is_skipped === true || metadata?.skipped_did_not_complete === true;
}

export function countsAsCompletionFromMetadata(metadata?: CompletedActivityMetadata | null): boolean {
  return isSkippedDidCompleteFromMetadata(metadata) || !isSkippedWithoutCompletionFromMetadata(metadata);
}
