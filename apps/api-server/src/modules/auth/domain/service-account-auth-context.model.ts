import { ApiProperty } from '@nestjs/swagger';

export class ServiceAccountAuthContext {
  @ApiProperty({ example: 'KUnNASRMQfhP0Ew5jPvFU0WAfOyieTFk@clients' })
  sub: string;

  @ApiProperty({ example: 'admin:b9f1bce9-c130-4141-80d6-3bde32a66512' })
  scope: string;

  @ApiProperty({ example: 'b9f1bce9-c130-4141-80d6-3bde32a66123' })
  teamId: string;

  @ApiProperty({ example: 'admin' })
  action: string;

  @ApiProperty({ example: 'https://focusbear.io/team-management' })
  aud: string;
}
