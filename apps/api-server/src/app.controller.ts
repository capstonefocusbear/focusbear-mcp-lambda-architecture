import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
@ApiTags('healthcheck')
@SkipThrottle()
export class AppController {
  @Get('/healthcheck')
  healthcheck(): string {
    return 'Alive';
  }
}
