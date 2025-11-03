import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { DateTime } from 'luxon';

export function IsValidCutoffTime(validationOptions?: ValidationOptions) {
  function registerIsValidCutoffTimeDecorator(object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isValidCutoffTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(cutoffTime: any, args: ValidationArguments) {
          const { startup_time, shutdown_time } = args.object as any;

          if (!cutoffTime) {
            return true;
          }

          const cutoff = DateTime.fromFormat(cutoffTime, 'HH:mm');
          const startup = DateTime.fromFormat(startup_time, 'HH:mm');
          const shutdown = DateTime.fromFormat(shutdown_time, 'HH:mm');

          if (!cutoff.isValid || !startup.isValid || !shutdown.isValid) {
            return false;
          }

          if (cutoff.equals(shutdown)) {
            const adjustedCutoff = shutdown.plus({ minutes: 1 });
            const formattedAdjustedCutoff = adjustedCutoff.toFormat('HH:mm');
            const target = args.object as Record<string, any>;
            Object.assign(target, { [propertyName]: formattedAdjustedCutoff });
            return true;
          }

          return (cutoff < startup && cutoff < shutdown) || cutoff > shutdown;
        },
        defaultMessage() {
          return (
            (validationOptions?.message as string) ||
            'cutoff_time must be either earlier than both startup_time and shutdown_time, or later than shutdown_time.'
          );
        },
      },
    });
  }

  return registerIsValidCutoffTimeDecorator;
}
