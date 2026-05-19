import { IStripeOptions } from '@app/stripe';
import { registerAs } from '@nestjs/config';

export const stripeConfig = registerAs(
  'stripeConfig',
  (): IStripeOptions => ({
    secretKey: process.env.STRIPE_SECRET_KEY,
    checkout: {
      success_url: process.env.STRIPE_CHECKOUT_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CHECKOUT_CANCEL_URL,
    },
    webhook: {
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  }),
);
