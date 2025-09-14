import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetTeamInsightsQueryDto {
  @ApiProperty({
    description: 'The UUID of the team the member belongs to',
    example: 'b9f1bce9-c130-4141-80d6-3bde32a66542',
  })
  @IsUUID()
  @IsNotEmpty()
  team_id!: string;

  @ApiProperty({
    description: 'The UUID of the member to fetch insights for',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  member_id!: string;
}
