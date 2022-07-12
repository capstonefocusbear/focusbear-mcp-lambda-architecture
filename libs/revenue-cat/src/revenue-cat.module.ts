import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IRevenueCatOptions } from './interfaces';
import { REVENUE_CAT_MODULE_OPTIONS } from './revenue-cat.constants';
import { RevenueCatService } from './revenue-cat.service';

@Module({
  providers: [RevenueCatService],
  exports: [RevenueCatService],
})
export class RevenueCatModule extends DynamicModuleFactory<IRevenueCatOptions>(REVENUE_CAT_MODULE_OPTIONS) {}
