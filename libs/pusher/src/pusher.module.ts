import { DynamicModuleFactory } from '@app/dynamic-module';
import { Module } from '@nestjs/common';
import { IPusherOptions } from './interfaces';
import { PUSHER_MODULE_OPTIONS } from './pusher.constants';
import { PusherService } from './pusher.service';

@Module({
  providers: [PusherService],
  exports: [PusherService],
})
export class PusherModule extends DynamicModuleFactory<IPusherOptions>(PUSHER_MODULE_OPTIONS) {}
