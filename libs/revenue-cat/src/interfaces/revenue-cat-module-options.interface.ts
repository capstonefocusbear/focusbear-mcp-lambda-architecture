export interface IRevenueCatOptions {
  secretApiKey: string;
  publicApiKey: string;
}

export interface IRevenueCatSubscription {
  expires_date: string;
}

interface IRevenueCatEntitlement {
  expires_date: string;
}

export interface IRevenueCatCustomer {
  first_seen: string;
  management_url: string;
  original_app_user_id: string;
  original_application_version: string;
  original_purchase_date: string;
  last_seen: string;
  non_subscriptions: {
    [key: string]: string;
  };
  other_purchases: {
    [key: string]: string;
  };
  entitlements: {
    [key: string]: IRevenueCatEntitlement;
  };
  subscriptions: {
    [key: string]: IRevenueCatSubscription;
  };
}
