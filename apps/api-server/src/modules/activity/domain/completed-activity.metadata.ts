import { Transform, TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { normalizeBooleanLike } from './completed-activity-metadata-coercion.utils';

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
