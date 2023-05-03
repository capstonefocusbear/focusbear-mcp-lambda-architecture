import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateFocusModeTagDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsString()
  text: string;
}
