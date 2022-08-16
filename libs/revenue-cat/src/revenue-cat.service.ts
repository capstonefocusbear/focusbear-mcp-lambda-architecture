import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import * as axios from 'axios';
import { SubscriptionProvider } from '../../../apps/api-server/src/modules/subscription/domain/subscription-provider.enum';
import { Entitlement } from '../../../apps/api-server/src/modules/subscription/domain/entitlement.enum';
import { SubscriptionStatus } from '../../../apps/api-server/src/modules/subscription/domain/subscription-status.model';
import { IRevenueCatOptions } from './interfaces';
import { REVENUE_CAT_MODULE_OPTIONS } from './revenue-cat.constants';

@Injectable()
export class RevenueCatService {
  constructor(@Inject(REVENUE_CAT_MODULE_OPTIONS) private options: IRevenueCatOptions) {}

  private httpService: axios.AxiosStatic = axios.default;

  async getOrCreateSubscriber(app_user_id: string): Promise<any> {
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}`;
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    return this.httpService.get(callUrl, { headers }).then(({ data }: axios.AxiosResponse<unknown, any>): any => data);
  }

  async grantTrialAccess(app_user_id: string) {
    await this.getOrCreateSubscriber(app_user_id);
    const personalAccess = Entitlement.personal;
    const duration = 'daily';
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${personalAccess}/promotional`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService
      .post(callUrl, { duration }, { headers })
      .then(({ data }: axios.AxiosResponse<unknown, any>): any => data);
  }

  async grantTeamMembershipe(app_user_id: string) {
    await this.getOrCreateSubscriber(app_user_id);
    const access = Entitlement.team_member;
    const duration = 'lifetime';
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${access}/promotional`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService
      .post(callUrl, { duration }, { headers })
      .then(({ data }: axios.AxiosResponse<unknown, any>): any => data);
  }

  checkSubscriptionStatus({ entitlements }): SubscriptionStatus {
    const emtitlementsEntries = Object.entries(entitlements);
    const hasNoEntitlements = emtitlementsEntries.length < 1;
    if (hasNoEntitlements) return new SubscriptionStatus();
    const activeEntitlementsEntries = emtitlementsEntries.filter(this.validateEntitlement);
    const activeEntitlements = Object.keys(Object.fromEntries(activeEntitlementsEntries));
    return new SubscriptionStatus({ activeEntitlements });
  }

  private validateEntitlement([, { expires_date }]): boolean {
    const now = new Date();
    const endDate = new Date(expires_date);
    const isEntitlementValid = endDate > now;
    return isEntitlementValid;
  }

  async revokeTeamMembershipe(app_user_id: string) {
    const access = Entitlement.team_member;
    const callUrl = `https://api.revenuecat.com/v1/subscribers/${app_user_id}/entitlements/${access}/revoke_promotionals`;
    const Authorization = `Bearer ${this.options.secretApiKey}`;
    const headers = { Authorization };
    return this.httpService.post(callUrl, { headers }).then(({ data }: axios.AxiosResponse<unknown, any>): any => data);
  }

  async createPurchase(provider: SubscriptionProvider, { app_user_id, fetch_token }) {
    const callUrl = 'https://api.revenuecat.com/v1/receipts';
    const Authorization = `Bearer ${this.options.publicApiKey}`;
    const headers = { Authorization };
    headers['X-Platform'] = provider;
    console.error({ headers });
    const body = { app_user_id, fetch_token };
    return this.httpService
      .post(callUrl, body, { headers })
      .then(({ data }: axios.AxiosResponse<unknown, any>): any => data)
      .catch((err) => {
        console.error(err);
        throw new BadRequestException(err);
      });
  }
}
