import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '../../../apps/api-server/src/shared/utils/constants';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';

@Injectable()
export class StripeService extends Stripe {
  constructor(@Inject(STRIPE_MODULE_OPTIONS) private options: IStripeOptions) {
    super(options.secretKey, { apiVersion: STRIPE_API_VERSION });
  }

  async createCheckoutSession(price: string, customer: string) {
    const { success_url, cancel_url } = this.options.checkout;
    return this.checkout.sessions
      .create({
        success_url,
        cancel_url,
        allow_promotion_codes: true,
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

  async decodeWebhookEvent(payload: any, headers: unknown): Promise<Stripe.Event> {
    const signature = headers['stripe-signature'];
    const webhookSecret = this.options.webhook.secret;
    const event = await this.webhooks.constructEventAsync(payload, signature, webhookSecret);
    return event;
  }

  async getProductsList({
    ending_before,
    starting_after,
    limit = 10,
    active = true,
  }: Stripe.ProductListParams): Promise<Stripe.ApiListPromise<Stripe.Product>> {
    return this.products
      .list({
        active,
        limit,
        ending_before,
        starting_after,
      })
      .catch((err) => {
        throw new BadRequestException(err.message);
      });
  }

  async getProductPrices({
    product,
    currency,
    ending_before,
    limit,
    lookup_keys,
    starting_after,
    active = true,
  }: Stripe.PriceListParams): Promise<Stripe.ApiListPromise<Stripe.Price>> {
    return this.prices
      .list({
        product,
        currency,
        ending_before,
        limit,
        lookup_keys,
        starting_after,
        active,
      })
      .catch((err) => {
        throw new BadRequestException(err.message);
      });
  }

  async getPriceDetails(price_id: string): Promise<Stripe.Response<Stripe.Price>> {
    return this.prices.retrieve(price_id).catch((err) => {
      throw new BadRequestException(err.message);
    });
  }

  async deleteStripeCustomer(stripeCustomerId: string) {
    await this.customers.del(stripeCustomerId);
  }
}
