export enum SubscriptionType {
  trial = 'trial', // has no RevenueCat purchase / the RevenueCat subscriber exists but it's empty / no charged
  personal = 'personal', // has RevenueCat purchase / the RevenueCat subscriber contains the purchase data / charged
  team_owner = 'team_owner', // has RevenueCat purchase (special product for team) / the RevenueCat subscriber contains the purchase data / charged / has Team association
  team_member = 'team_member', // has no RevenueCat purchase / the RevenueCat subscriber exists but it's empty / no charged / has Team association
}
