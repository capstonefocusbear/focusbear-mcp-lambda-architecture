import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
// import { IsTimestampLesserThanNow } from '../../activity/dto/create-completed-activity.dto';

// export function IsTimestampGreaterThanNow(property: string, validationOptions?: ValidationOptions) {
//   return function (object: any, propertyName: string) {
//     registerDecorator({
//       target: object.constructor,
//       propertyName,
//       constraints: [property],
//       options: validationOptions,
//       validator: {
//         validate(value: any) {
//           const now = new Date();
//           return value >= now;
//         },
//       },
//     });
//   };
// }

export class StartFocusModeDto {
  @IsOptional()
  @IsString()
  intention?: string;

  @IsNotEmpty()
  // @IsTimestampGreaterThanNow(null, { message: 'finish_time should be greater than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'finish_time  should be a valid ISO string in UTC zone' })
  finish_time: Date;

  @IsNotEmpty()
  // @IsTimestampLesserThanNow(null, { message: 'start_time should be lesser than NOW!' })
  @Type(() => Date)
  @IsDate({ message: 'start_time  should be a valid ISO string in UTC zone' })
  start_time: Date;
}
