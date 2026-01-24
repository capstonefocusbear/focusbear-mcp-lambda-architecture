import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNoteTagDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;
}
