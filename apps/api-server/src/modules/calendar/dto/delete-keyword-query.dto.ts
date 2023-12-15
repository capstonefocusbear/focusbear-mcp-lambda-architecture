import { IsOptional, IsUUID } from 'class-validator';

export class DeleteKeyWordQuery {
  @IsOptional()
  @IsUUID()
  id: string;
}
