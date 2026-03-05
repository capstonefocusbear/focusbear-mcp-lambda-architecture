import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { OpenclawScope } from '../domain/openclaw-scopes.enum';

export class CreateOpenclawTokenDto {
  @ApiProperty({
    description: 'Scopes granted to this token',
    enum: OpenclawScope,
    isArray: true,
    example: ['tasks:read', 'tasks:write'],
  })
  @IsArray()
  @IsEnum(OpenclawScope, { each: true })
  scopes: OpenclawScope[];

  @ApiProperty({
    description: 'Human-readable label for this token (e.g. "My OpenClaw")',
    required: false,
    example: 'My OpenClaw',
  })
  @IsOptional()
  @IsString()
  label?: string;
}
