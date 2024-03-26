import { Module } from '@nestjs/common';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';
import { StripeService } from './stripe.service';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  providers: [StripeService],
  exports: [StripeService],
  imports: [
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('sentry'),
    }),
  ],
})
export class StripeModule extends DynamicModuleFactory<IStripeOptions>(STRIPE_MODULE_OPTIONS) {}
