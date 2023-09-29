export class ProfitWellCustomer {
  constructor({
    user_alias,
    subscription_alias,
    email,
    plan_id,
    plan_interval,
    value,
    plan_currency,
    effective_date,
    status,
    data_provider_user_id,
  }: ProfitWellCustomer) {
    this.user_alias = user_alias;
    this.subscription_alias = subscription_alias;
    this.email = email;
    this.plan_id = plan_id;
    this.plan_interval = plan_interval;
    this.value = value;
    this.plan_currency = plan_currency;
    this.effective_date = effective_date;
    this.status = status;
    this.data_provider_user_id = data_provider_user_id;
  }

  user_alias: string;

  subscription_alias: string;

  email: string;

  plan_id: string;

  plan_interval: string;

  value: number;

  plan_currency: string;

  effective_date: number;

  status: string;

  data_provider_user_id: string;
}
