import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { DateTime } from 'luxon';
import { TRIAL_DURATION_DAYS } from '../../../apps/api-server/src/shared/utils/constants';
import { SubscriptionProvider } from '../../../apps/api-server/src/modules/subscription/domain/subscription-provider.enum';
import { Entitlement } from '../../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { SubscriptionStatus } from '../../../apps/api-server/src/modules/subscription/domain/subscription-status.model';
import { IRevenueCatOptions, IRevenueCatCustomer } from './interfaces';
import { REVENUE_CAT_MODULE_OPTIONS } from './revenue-cat.constants';

@Injectable()
export class RevenueCatService {
  constructor(@Inject(REVENUE_CAT_MODULE_OPTIONS) private options: IRevenueCatOptions) {}

  private httpService = axios.create({
    baseURL: 'https://api.revenuecat.com/v1/',
    headers: {
      Authorization: `Bearer ${this.options.secretApiKey}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  });

  async getOrCreateSubscriber(app_user_id: string): Promise<IRevenueCatCustomer> {
    const callUrl = `subscribers/${app_user_id}`;
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    const response = await this.httpService.get(callUrl, { headers });
    if (response.status === 400 || response.status === 401) {
      throw new BadRequestException(response);
    }
    return { ...response.data.subscriber };
  }

  async grantTrialAccess(app_user_id: string) {
    await this.getOrCreateSubscriber(app_user_id);
    const trialAccess = Entitlement.trial;
    const duration = 'weekly';
    const callUrl = `subscribers/${app_user_id}/entitlements/${trialAccess}/promotional`;
    const response = await this.httpService.post(callUrl, { duration });
    if (response.status !== 201) {
      throw new BadRequestException(response);
    }
    const revenueCatCustomer: IRevenueCatCustomer = { ...response.data.subscriber };
    return revenueCatCustomer;
  }

  async grantTeamMembership(app_user_id: string, entitlement: Entitlement) {
    await this.getOrCreateSubscriber(app_user_id);
    const duration = 'lifetime';
    const callUrl = `subscribers/${app_user_id}/entitlements/${entitlement}/promotional`;
    return this.httpService.post(callUrl, { duration }).then(({ data }: AxiosResponse<unknown, any>): any => data);
  }

  checkSubscriptionStatus({ entitlements }): SubscriptionStatus {
    const entitlementsEntries = Object.entries(entitlements);
    const hasNoEntitlements = entitlementsEntries.length < 1;
    if (hasNoEntitlements) return new SubscriptionStatus();
    const activeEntitlementsEntries = entitlementsEntries.filter(this.validateEntitlement);
    const activeEntitlements = Object.keys(Object.fromEntries(activeEntitlementsEntries));
    const expirations = Object.fromEntries(activeEntitlementsEntries.map((e) => this.getExpirations(e)));
    return new SubscriptionStatus({ activeEntitlements, expirations });
  }

  getTrialSubscription(): SubscriptionStatus {
    const activeEntitlements = [Entitlement.trial];
    const currentDate = DateTime.local();
    const expirations = {
      trial: {
        expires_date: currentDate.plus({ days: TRIAL_DURATION_DAYS }).toISO(),
        purchase_date: currentDate.toISO(),
        days_left: TRIAL_DURATION_DAYS,
      },
    };
    return new SubscriptionStatus({ activeEntitlements, expirations });
  }

  private getExpirations([key, { expires_date, purchase_date }]: [string, any]): [string, unknown] {
    const now = Date.now();
    const endDate = new Date(expires_date).getTime();
    const days_left = Math.ceil((endDate - now) / (24 * 60 * 60 * 1000));
    return [key, { expires_date, purchase_date, days_left }];
  }

  private validateEntitlement([, { expires_date }]): boolean {
    const now = new Date();
    const endDate = new Date(expires_date);
    const isEntitlementValid = endDate > now;
    return isEntitlementValid;
  }

  async revokeTeamMembership(app_user_id: string, entitlement: Entitlement) {
    const callUrl = `subscribers/${app_user_id}/entitlements/${entitlement}/revoke_promotionals`;
    return this.httpService
      .post(callUrl)
      .then(({ data }: AxiosResponse<unknown, any>): any => data)
      .catch((e) => console.error(e?.response));
  }

  async createPurchase(provider: SubscriptionProvider, { app_user_id, fetch_token }) {
    const callUrl = 'https://api.revenuecat.com/v1/receipts';
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    headers['X-Platform'] = provider;
    const body = { app_user_id, fetch_token };
    return this.httpService
      .post(callUrl, body, { headers })
      .then(({ data }: AxiosResponse<unknown, any>): any => data)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  async deleteUserFromRevenueCat(app_user_id: string) {
    const callUrl = `subscribers/${app_user_id}`;
    await this.httpService.delete(callUrl);
  }

  // using a secret API key to fetch the customer's attributes.
  async getSubscriberFromRevenueCat(app_user_id: string): Promise<any> {
    const callUrl = `subscribers/${app_user_id}`;
    return this.httpService.get(callUrl).then(({ data }: AxiosResponse<unknown, any>): any => data);
  }
}
