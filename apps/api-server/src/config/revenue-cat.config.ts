import { registerAs } from '@nestjs/config';
import { IRevenueCatOptions } from '../../../../libs/revenue-cat/src';

export const revenueCatConfig = registerAs(
  'revenueCat',
  (): IRevenueCatOptions => ({
    secretApiKey: process.env.REVENUE_CAT_SECRET_KEY,
    publicApiKey: process.env.REVENUE_CAT_PUBLIC_KEY,
  }),
);
