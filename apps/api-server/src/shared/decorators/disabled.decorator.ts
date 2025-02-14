import { BadRequestException } from '@nestjs/common';

export function Disabled(): MethodDecorator {
  return (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor => {
    return {
      ...descriptor,
      value: function disabled() {
        throw new BadRequestException('This endpoint is disabled.');
      },
    };
  };
}
