import { IsEmail, IsOptional, IsUUID } from 'class-validator';

export class SearchForUserDto {
  @IsOptional()
  stripe_customer_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  id?: string;
}
