import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';

@Injectable()
export class StripeService extends Stripe {
  constructor(@Inject(STRIPE_MODULE_OPTIONS) private options: IStripeOptions) {
    super(options.secretKey, { apiVersion: '2022-08-01' });
  }

  async createCheckoutSession(price: string, customer: string) {
    const { success_url, cancel_url } = this.options.checkout;
    return this.checkout.sessions
      .create({
        success_url,
        cancel_url,
        customer,
        line_items: [{ price, quantity: 1 }],
        mode: 'subscription',
      })
      .catch((err) => {
        throw new BadRequestException(err.message);
      });
  }

  async createPortalSession(customer: string) {
    return this.billingPortal.sessions
      .create({
        customer,
        return_url: this.options.checkout.success_url,
      })
      .catch((err) => {
        throw new BadRequestException(err.message);
      });
  }

  async registerNewCustomer(email?: string) {
    return this.customers.create({ email });
  }
}
