import { IsDate, IsNotEmpty, IsUUID, ValidationOptions, registerDecorator } from 'class-validator';

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
  @IsUUID()
  @IsNotEmpty()
  team_id: string;

  @IsUUID()
  @IsNotEmpty()
  member_id: string;

  @IsDate()
  @IsNotEmpty()
  @IsTimestampGreaterThanNow(null, { message: 'expiry_date should be later than current time.' })
  expiry_date: Date;
}
