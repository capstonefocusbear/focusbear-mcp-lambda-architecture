import { IsNumber } from 'class-validator';

export class GetUsersListQueryDto {
  @IsNumber()
  take?: number;

  @IsNumber()
  skip?: number;
}
