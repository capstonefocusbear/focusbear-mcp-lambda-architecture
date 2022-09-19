import { IsString } from 'class-validator';

export class GetUsersQueryDto {
  @IsString()
  search?: string;
}
