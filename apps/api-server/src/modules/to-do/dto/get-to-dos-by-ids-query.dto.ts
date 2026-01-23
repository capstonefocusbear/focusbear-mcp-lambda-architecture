import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

const MAX_IDS = 100;

export class GetToDosByIdsQueryDto {
  @ApiProperty({
    description: 'Comma-separated list of to-do IDs',
    example: '550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001',
  })
  @Transform(({ obj, key }) => {
    const value = obj[key];

    if (Array.isArray(value)) {
      return value.map((id) => (typeof id === 'string' ? id.trim() : id)).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }

    return value;
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_IDS)
  @IsUUID('all', { each: true })
  ids: string[];
}
