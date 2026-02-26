import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateNoteTagDto } from './create-note-tag.dto';

export class CreateNoteDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  body?: string;

  @IsOptional()
  @IsUUID()
  completed_activity_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNoteTagDto)
  tags?: CreateNoteTagDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  embedded_todo_ids?: string[];

  @IsOptional()
  @IsBoolean()
  is_brain_dump?: boolean;
}
