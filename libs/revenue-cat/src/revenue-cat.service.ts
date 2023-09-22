import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { SubscriptionProvider } from '../../../apps/api-server/src/modules/subscription/domain/subscription-provider.enum';
import { Entitlement } from '../../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { SubscriptionStatus } from '../../../apps/api-server/src/modules/subscription/domain/subscription-status.model';
import { IRevenueCatOptions } from './interfaces';
import { REVENUE_CAT_MODULE_OPTIONS } from './revenue-cat.constants';

@Injectable()
export class RevenueCatService {
  constructor(@Inject(REVENUE_CAT_MODULE_OPTIONS) private options: IRevenueCatOptions) {}

  private httpService = axios;

  async getOrCreateSubscriber(app_user_id: string): Promise<any> {
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}`;
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    return this.httpService.get(callUrl, { headers }).then(({ data }: AxiosResponse<unknown, any>): any => data);
  }

  async grantTrialAccess(app_user_id: string) {
    await this.getOrCreateSubscriber(app_user_id);
    const trialAccess = Entitlement.trial;
    const duration = 'weekly';
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${trialAccess}/promotional`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService
      .post(callUrl, { duration }, { headers })
      .then(({ data }: AxiosResponse<unknown, any>): any => data);
  }

  async grantTeamMembership(app_user_id: string, entitlement: Entitlement) {
    await this.getOrCreateSubscriber(app_user_id);
    const duration = 'lifetime';
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${entitlement}/promotional`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService
      .post(callUrl, { duration }, { headers })
      .then(({ data }: AxiosResponse<unknown, any>): any => data);
  }

  checkSubscriptionStatus({ entitlements }): SubscriptionStatus {
    const emtitlementsEntries = Object.entries(entitlements);
    const hasNoEntitlements = emtitlementsEntries.length < 1;
    if (hasNoEntitlements) return new SubscriptionStatus();
    const activeEntitlementsEntries = emtitlementsEntries.filter(this.validateEntitlement);
    const activeEntitlements = Object.keys(Object.fromEntries(activeEntitlementsEntries));
    const expirations = Object.fromEntries(activeEntitlementsEntries.map((e) => this.getExpirations(e)));
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
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${entitlement}/revoke_promotionals`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService.post(callUrl, { headers }).then(({ data }: AxiosResponse<unknown, any>): any => data);
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
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization, accept: 'application/json', 'Content-Type': 'application/json' };
    await this.httpService.delete(callUrl, { headers });
  }
}
