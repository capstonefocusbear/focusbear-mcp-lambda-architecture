import { Module } from '@nestjs/common';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IRevenueCatOptions, RevenueCatModule } from '@app/revenue-cat';
import { ISendGridOptions, SendGridModule } from '@app/send-grid';
import { DynamicModuleFactory } from '../../dynamic-module/src';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';
import { StripeService } from './stripe.service';

@Module({
  providers: [StripeService],
  exports: [StripeService],
  imports: [
    SentryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => config.get('sentry'),
    }),
    RevenueCatModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): IRevenueCatOptions => configService.get('revenueCat'),
    }),
    SendGridModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ISendGridOptions => configService.get('sendGrid'),
    }),
  ],
})
export class StripeModule extends DynamicModuleFactory<IStripeOptions>(STRIPE_MODULE_OPTIONS) {}
