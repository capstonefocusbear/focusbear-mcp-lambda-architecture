import { IsString, registerDecorator, ValidationOptions } from 'class-validator';

function PasswordComplexity(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'passwordComplexity',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          if (value.length < 8) return false;

          const checks = [/[a-z]/.test(value), /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9\s]/.test(value)];

          const passedChecks = checks.filter(Boolean).length;
          return passedChecks >= 3;
        },
        defaultMessage() {
          return 'Password must be at least 8 characters long and contain at least 3 of the following: lowercase letters, uppercase letters, numbers, special characters.';
        },
      },
    });
  };
}

export class ChangePasswordDto {
  @IsString()
  token: string;

  @IsString()
  @PasswordComplexity()
  newPassword: string;
}
