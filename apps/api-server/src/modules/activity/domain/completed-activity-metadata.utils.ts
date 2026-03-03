import { CompletedActivityMetadata } from './completed-activity.metadata';

/**
 * Legacy clients can still send `is_skipped`, while newer clients may send
 * `skipped_did_not_complete` or `skipped_did_complete`.
 * If flags conflict, `skipped_did_complete` wins to preserve existing behavior
 * where "already did it" counts as completion.
 */
function isTruthyBooleanLike(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue === 'true' || normalizedValue === '1';
  }

  return false;
}

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
