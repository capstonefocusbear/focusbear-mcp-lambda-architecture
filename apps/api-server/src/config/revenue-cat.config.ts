import { registerAs } from '@nestjs/config';
import { IRevenueCatOptions } from '@app/revenue-cat';

export const revenueCatConfig = registerAs(
  'revenueCat',
  (): IRevenueCatOptions => ({
    secretApiKey: process.env.REVENUE_CAT_SECRET_KEY,
    publicApiKey: process.env.REVENUE_CAT_PUBLIC_KEY,
  }),
);
