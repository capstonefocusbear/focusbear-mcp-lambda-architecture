import { IsOptional, IsUUID } from 'class-validator';

export class UpdateUserSignUpFieldDto {
  @IsUUID('4')
  @IsOptional()
  pack_id?: string;

  @IsUUID('4')
  @IsOptional()
  focus_mode_template_id?: string;
}
