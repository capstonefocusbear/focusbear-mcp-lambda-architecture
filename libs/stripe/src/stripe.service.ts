import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import axios from 'axios';
import { RevenueCatService } from '@app/revenue-cat';
import { SendGridService } from '@app/send-grid';
import { UserRepository } from '../../../apps/api-server/src/modules/user/repositories/user.repository';
import { Auth0ManagementService } from '@app/auth0/services/auth0-management.service';
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
    @InjectSentry() private readonly sentryService: SentryService,
    private readonly revenueCatService: RevenueCatService,
    private readonly emailService: SendGridService,
    private readonly userRepository: UserRepository,
    private readonly auth0ManagementService: Auth0ManagementService,
  ) {
    super(options.secretKey, { apiVersion: STRIPE_API_VERSION });
  }

  private readonly ormFeedback = AppDataSource.getRepository(Feedback);

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
    await this.subscriptions.del(subscriptionId);
  }

  // Not having an await may cause emails to not be sent sometimes
  // TODO: - Move email logic to a background job via BULL. Issue #951 - https://github.com/Focus-Bear/backend/issues/951
  async logCancellation(session: CancelSubscriptionSession, user: UserAuthContext) {
    const cancelledUser = await this.userRepository.orm.findOneBy({ id: user.id });
    if (!cancelledUser) {
      throw new NotFoundException(`User with ID: ${user.id} does not exist!`);
    }

    const cliqUrl = `${process.env.ZOHO_CLIQ_BACKEND_BOT_WEBHOOK}?zapikey=${process.env.ZOHO_CLIQ_API_KEY}`;
    const body = {
      channel: process.env.ZOHO_CLIQ_CUSTOMER_FEEDBACK_CHANNEL,
      message: `Subscription canceled\n\n User:${user.id} \n\n Reason:${session.cancel_subscription_reason}`,
    };

    const auth0User = await this.auth0ManagementService.getAuth0User(cancelledUser.auth0_id);

    axios.post(cliqUrl, body);

    this.emailService.sendEmail({
      to: FOCUS_BEAR_EMAILS.ZOHO_DESK_SUPPORT,
      from: FOCUS_BEAR_EMAILS.SUPPORT,
      replyTo: auth0User.email,
      text: `User ID: ${user.id}\n\n${prettyJson(session)}`,
      subject: `${EMAIL_SUBJECTS.USER_UNSUBSCRIBE_FEEDBACK}: ${session.cancel_subscription_reason}`,
    });
  }

  async cancelSubscriptionSession(session: CancelSubscriptionSession, user: UserAuthContext) {
    const { cancel_subscription_reason, entitlement_id } = session;
    try {
      const subscriptions = await this.subscriptions.list({ customer: user.stripeCustomerId });
      if (!subscriptions.data.length) {
        throw new NotFoundException(`No active subscription found for user ID: ${user.id}`);
      }
      await this.cancelSubscription(subscriptions.data[0].id);
      const feedback = new Feedback({
        cancel_subscription_reason,
        user_id: user.id,
      });

      await Promise.allSettled([
        this.ormFeedback.save(feedback),
        this.revenueCatService.revokeUserEntitlementFromRevenueCat(user.id, entitlement_id),
      ]);

      this.logCancellation(session, user);
    } catch (error) {
      this.sentryService.instance().captureException(error, { level: 'error' });
      throw error;
    }
  }
}
