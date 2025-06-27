import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsUUID, ValidationOptions, registerDecorator } from 'class-validator';

export function IsTimestampGreaterThanNow(property: string, validationOptions?: ValidationOptions) {
  // eslint-disable-next-line func-names
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any) {
          const now = new Date();
          return value >= now;
        },
      },
    });
  };
}

export class UpdateMemberExpiryDateDto {
  @IsNotEmpty()
  @IsUUID()
  team_id: string;

  @IsOptional()
  @IsUUID()
  member_id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  @IsDate()
  @IsTimestampGreaterThanNow(null, { message: 'expiry_date should be later than current time.' })
  expiry_date: Date;
}
