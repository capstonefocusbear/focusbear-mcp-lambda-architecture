import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IPusherBeamsOptions } from './interfaces';
import { PUSHER_BEAMS_MODULE_OPTIONS } from './pusher-beams.constants';
import { PusherBeamsService } from './pusher-beams.service';

@Module({
  providers: [PusherBeamsService],
  exports: [PusherBeamsService],
})
export class PusherBeamsModule extends DynamicModuleFactory<IPusherBeamsOptions>(PUSHER_BEAMS_MODULE_OPTIONS) {}
