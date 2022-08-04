import { Entitlement } from './entitlement.enum';

export class SubscriptionStatus {
  constructor({ activeEntitlements }: Partial<SubscriptionStatus> = {}) {
    this.hasActiveSubscription = activeEntitlements?.length > 0;
    this.activeEntitlements = activeEntitlements || [];
  }

  hasActiveSubscription: boolean;

  activeEntitlements: Entitlement[] | string[];
}
