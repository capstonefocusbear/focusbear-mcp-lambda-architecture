import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IR2Options } from './interfaces';
import { R2_MODULE_OPTIONS } from './r2.constants';
import { R2Service } from './services/r2.service';

@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module extends DynamicModuleFactory<IR2Options>(R2_MODULE_OPTIONS) {}
