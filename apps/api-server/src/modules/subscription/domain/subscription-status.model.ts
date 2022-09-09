import { Entitlement } from './entitlement.enum';

export class SubscriptionStatus {
  constructor({ activeEntitlements, expirations }: Partial<SubscriptionStatus> = {}) {
    this.hasActiveSubscription = activeEntitlements?.length > 0;
    this.activeEntitlements = activeEntitlements || [];
    this.expirations = expirations;
  }

  hasActiveSubscription: boolean;

  activeEntitlements: Entitlement[] | string[];

  expirations?: any;
}
