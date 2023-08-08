import { Entitlement } from '../../subscription/domain/entitlement.enum';

export class ProfitWellData {
  stripe_customer_id?: string;

  userActiveSubscription?: Entitlement | null;

  last_status_synced_with_profitwell?: Entitlement | null | string;

  subscriptionStatus?: string;

  renewalAmountCents?: number;

  effectiveDate?: number;
}
