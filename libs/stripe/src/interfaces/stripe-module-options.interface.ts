export interface IStripeOptions {
  secretKey: string;
  apiVersion?: string;
  checkout: {
    success_url?: string;
    cancel_url?: string;
  };
  webhook: {
    secret?: string;
  };
}
