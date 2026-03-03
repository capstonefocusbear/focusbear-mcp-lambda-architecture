import {
  countsAsCompletionFromMetadata,
  isSkippedDidCompleteFromMetadata,
  isSkippedWithoutCompletionFromMetadata,
} from './completed-activity-metadata.utils';

describe('completed-activity-metadata.utils', () => {
  it('should treat empty metadata as completion', () => {
    expect(isSkippedDidCompleteFromMetadata(undefined)).toBe(false);
    expect(isSkippedWithoutCompletionFromMetadata(undefined)).toBe(false);
    expect(countsAsCompletionFromMetadata(undefined)).toBe(true);
  });

  it('should treat is_skipped as skipped without completion', () => {
    const metadata = { is_skipped: true };

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(false);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(true);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(false);
  });

  it('should treat skipped_did_not_complete as skipped without completion', () => {
    const metadata = { skipped_did_not_complete: true };

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(false);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(true);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(false);
  });

  it('should treat skipped_did_complete as completion', () => {
    const metadata = { skipped_did_complete: true };

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(true);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(false);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(true);
  });

  it('should let skipped_did_complete win when flags conflict', () => {
    const metadata = { is_skipped: true, skipped_did_complete: true };

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(true);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(false);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(true);
  });

  it('should handle legacy boolean-like strings', () => {
    const metadata = { is_skipped: 'true', skipped_did_complete: 'false' } as any;

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(false);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(true);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(false);
  });

  it('should handle numeric boolean-like values', () => {
    const metadata = { is_skipped: 0, skipped_did_not_complete: 1, skipped_did_complete: 0 } as any;

    expect(isSkippedDidCompleteFromMetadata(metadata)).toBe(false);
    expect(isSkippedWithoutCompletionFromMetadata(metadata)).toBe(true);
    expect(countsAsCompletionFromMetadata(metadata)).toBe(false);
  });
});
