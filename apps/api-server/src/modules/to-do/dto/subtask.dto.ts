import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class SubtaskDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsBoolean()
  is_completed: boolean;
}
