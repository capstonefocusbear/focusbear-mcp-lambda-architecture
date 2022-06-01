import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('healthcheck')
export class AppController {
  @Get('/healthcheck')
  healthcheck(): string {
    return 'Alive';
  }
}
