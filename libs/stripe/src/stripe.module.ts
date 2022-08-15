import { DynamicModuleFactory } from '@app/dynamic-module';
import { Module } from '@nestjs/common';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';
import { StripeService } from './stripe.service';

@Module({
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule extends DynamicModuleFactory<IStripeOptions>(STRIPE_MODULE_OPTIONS) {}
