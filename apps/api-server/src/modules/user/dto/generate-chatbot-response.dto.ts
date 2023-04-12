import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateChatBotResponseDto {
  @IsNotEmpty()
  @IsArray()
  chat: any;

  @IsOptional()
  @IsString()
  language: string;
}
