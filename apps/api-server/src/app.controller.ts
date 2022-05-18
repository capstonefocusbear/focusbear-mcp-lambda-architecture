import { Controller, Get, UseGuards } from '@nestjs/common';
import { IsAuth } from './modules/auth/guards/is-auth.guard';

@Controller()
export class AppController {
  @UseGuards(IsAuth)
  @Get('/test')
  test() {
    return 'Alive';
  }
}
