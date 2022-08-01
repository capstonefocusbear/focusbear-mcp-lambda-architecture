export enum SubscriptionStatus {
  active = 'active', // has not expired subscription
  payment_failed = 'payment failed', // not active because of payment failure
  cancelled = 'cancelled', // not active because of cancelation
  expired = 'expired', // not active because of reaching expiration date
}
