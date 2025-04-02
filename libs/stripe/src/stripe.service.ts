import { BadRequestException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios, { AxiosResponse } from 'axios';
import { RevenueCatService } from '@app/revenue-cat';
import { Auth0ManagementService } from '@app/auth0/services/auth0-management.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { User } from 'apps/api-server/src/modules/user/entities/user.entity';
import { GetUsers200ResponseOneOfInner } from 'auth0';
import { UserRepository } from '../../../apps/api-server/src/modules/user/repositories/user.repository';
import { CreateStripeCheckoutSessionDto } from '../../../apps/api-server/src/modules/subscription/dto/create-stripe-checkout-session.dto';
import {
  EMAIL_SUBJECTS,
  FOCUS_BEAR_EMAILS,
  STRIPE_API_VERSION,
} from '../../../apps/api-server/src/shared/utils/constants';
import { IStripeOptions } from './interfaces';
import { STRIPE_MODULE_OPTIONS } from './stripe.constants';
import { findNonZeroTotal, prettyJson } from '../../../apps/api-server/src/shared/utils/helpers';
import { CancelSubscriptionSession } from '../../../apps/api-server/src/modules/subscription/dto/cancel-subscription-session';
import { UserAuthContext } from '../../../apps/api-server/src/modules/auth/domain/user-auth-context.model';
import { Feedback } from './entities/feedback.entity';
import { AppDataSource } from '../../../apps/api-server/ormconfig';

@Injectable()
export class StripeService extends Stripe {
  constructor(
    @Inject(STRIPE_MODULE_OPTIONS) private options: IStripeOptions,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly revenueCatService: RevenueCatService,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {
    super(options.secretKey, { apiVersion: STRIPE_API_VERSION });
  }

  readonly ormFeedback = AppDataSource.getRepository(Feedback);

  async createCheckoutSession(
    customer: string,
    { price_id, team_id, team_size = 1, team_name }: CreateStripeCheckoutSessionDto,
  ) {
    const { success_url, cancel_url } = this.options.checkout;
    return this.checkout.sessions
      .create({
        success_url,
        cancel_url,
        allow_promotion_codes: true,
        customer,
        automatic_tax: { enabled: true },
        customer_update: { address: 'auto' },
        billing_address_collection: 'auto',
        line_items: [
          {
            price: price_id,
            quantity: team_size,
          },
        ],
        mode: 'subscription',
        subscription_data: { metadata: { team_id, team_name } },
      })
      .catch((err) => {
        throw new BadRequestException(err.message);
      });
  }

  async updateSubscription(subId: string, subItemId: string, quantity: number) {
    const subscription = await this.subscriptions.update(subId, {
      items: [
        {
          id: subItemId,
          quantity,
        },
      ],
    });
    return subscription;
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

  async registerNewCustomer(email?: string, platform?: string) {
    return this.customers.create({
      email,
      metadata: {
        is_internal_user: email?.includes('focusbear.io').toString(),
        platform,
      },
    });
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

  async getStripeCustomerId(email: string) {
    const { data: users } = await this.customers.list({ email });
    if (users.length < 1) {
      return null;
    }
    return users[0].id;
  }

  async getCustomerSubscriptionRate(stripeCustomerId: string) {
    const stripeUser: any = await this.customers.retrieve(stripeCustomerId, { expand: ['subscriptions'] });
    const invoiceId = stripeUser.subscriptions?.data[0]?.latest_invoice ?? null;
    if (!invoiceId) return 0;
    const userInvoices = await this.invoices.list({ customer: stripeCustomerId });
    return findNonZeroTotal(userInvoices.data);
  }

  async cancelSubscription(subscriptionId: string) {
    return this.subscriptions.del(subscriptionId);
  }

  async logCancellation(session: CancelSubscriptionSession, user_id: string, email?: string) {
    if (email) {
      // Queue the email job using Bull
      await this.emailQueue.add('sendEmail', {
        to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
        from: FOCUS_BEAR_EMAILS.SUPPORT,
        replyTo: email,
        subject: `${EMAIL_SUBJECTS.USER_UNSUBSCRIBE_FEEDBACK}: ${session.cancel_subscription_reason}`,
        text: `User ID: ${user_id}\n\n${prettyJson(session)}`,
      });
    }

    const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
    const body = {
      channel: process.env.ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL,
      message: `Subscription canceled\n\n User:${user_id} \n\n Reason:${session.cancel_subscription_reason}`,
    };

    return axios.post(cliqUrl, body);
  }

  async cancelSubscriptionSession(session: CancelSubscriptionSession, userAuthContext: UserAuthContext) {
    try {
      const [userResponse, subscriptionsResponse] = await Promise.allSettled([
        this.userRepository.orm.findOneBy({ id: userAuthContext.id }),
        this.subscriptions.list({ customer: userAuthContext.stripeCustomerId }),
      ]);

      const user = (userResponse as PromiseFulfilledResult<User>).value;
      const subscriptions = (subscriptionsResponse as PromiseFulfilledResult<Stripe.ApiList<Stripe.Subscription>>)
        .value;

      if (!user) {
        throw new NotFoundException(`User with ID: ${userAuthContext.id} does not exist!`);
      }

      if (!subscriptions.data.length) {
        throw new NotFoundException(`No active subscription found for user ID: ${user.id}`);
      }

      const [stripePromiseResponse, revenueCatPromiseResponse] = await Promise.allSettled([
        this.cancelSubscription(subscriptions.data[0].id),
        await this.revenueCatService.revokeUserEntitlementFromRevenueCat(user.id, session.entitlement_id),
      ]);

      const stripeResponse = (stripePromiseResponse as PromiseFulfilledResult<Stripe.Response<Stripe.Subscription>>)
        .value;
      const revenueCatResponse = (revenueCatPromiseResponse as PromiseFulfilledResult<AxiosResponse>).value;

      if (stripeResponse.status !== 'canceled') {
        this.sentryService.instance().captureException(stripeResponse, { level: 'warning' });
      }

      if (revenueCatResponse.status !== HttpStatus.OK) {
        this.sentryService.instance().captureException(revenueCatResponse, { level: 'warning' });
      }

      const feedback = new Feedback({
        cancel_subscription_reason: session.cancel_subscription_reason,
        user_id: user.id,
      });

      const [auth0UserPromiseResponse, feedbackPromiseResponse] = await Promise.allSettled([
        this.auth0ManagementService.getAuth0User(user.auth0_id),
        this.ormFeedback.save(feedback),
      ]);

      const auth0User = (auth0UserPromiseResponse as PromiseFulfilledResult<GetUsers200ResponseOneOfInner>).value;
      const feedbackResponse = (feedbackPromiseResponse as PromiseFulfilledResult<Feedback>).value;

      if (!feedbackResponse) {
        this.sentryService
          .instance()
          .captureException('User feedback could not be saved due to missing or invalid response data.', {
            level: 'warning',
          });
      }

      return await this.logCancellation(session, user.id, auth0User.email);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
