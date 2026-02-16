import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { isPublicWebhookUrl } from '../utils/webhook-url';

export function IsPublicWebhookUrl(validationOptions?: ValidationOptions) {
  return function registerIsPublicWebhookUrlDecorator(object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isPublicWebhookUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value) return true;
          return isPublicWebhookUrl(value);
        },
        defaultMessage(args: ValidationArguments) {
          return (
            (validationOptions?.message as string) ||
            `${args.property} must be a public https URL and not a localhost or private IP address`
          );
        },
      },
    });
  };
}
