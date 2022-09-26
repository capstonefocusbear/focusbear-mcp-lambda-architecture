import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { ISendGridOptions } from './interfaces';
import { SEND_GRID_MODULE_OPTIONS } from './send-grid.constants';
import { SendGridService } from './send-grid.service';

@Module({
  providers: [SendGridService],
  exports: [SendGridService],
})
export class SendGridModule extends DynamicModuleFactory<ISendGridOptions>(SEND_GRID_MODULE_OPTIONS) {}
