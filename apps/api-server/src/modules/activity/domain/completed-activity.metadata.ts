import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export function normalizeBooleanLike(value: unknown): boolean | undefined | unknown {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'true' || normalizedValue === '1') return true;
    if (normalizedValue === 'false' || normalizedValue === '0') return false;
  }

  return value;
}

export function isTruthyBooleanLike(value: unknown): boolean {
  return normalizeBooleanLike(value) === true;
}

function toBooleanIfBooleanLike({ value }: TransformFnParams) {
  return normalizeBooleanLike(value);
}

export class CompletedActivityMetadata {
  @IsOptional()
  @Transform(toBooleanIfBooleanLike, { toClassOnly: true })
  @IsBoolean()
  is_skipped?: boolean;

  @IsOptional()
  @Transform(toBooleanIfBooleanLike, { toClassOnly: true })
  @IsBoolean()
  skipped_did_not_complete?: boolean;

  @IsOptional()
  @Transform(toBooleanIfBooleanLike, { toClassOnly: true })
  @IsBoolean()
  skipped_did_complete?: boolean;
}
