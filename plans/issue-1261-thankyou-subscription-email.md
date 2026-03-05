# Plan: Send Thank-You Email When User Pays for Subscription (Issue #1261)

## What the issue asks for

When a user successfully pays for a Focus Bear subscription (either via Stripe or RevenueCat), they should receive a "Thank you for subscribing!" email. This improves user experience and confirms the purchase.

## Current State of the Code

### Webhook Handler
**`apps/api-server/src/modules/subscription/services/webhook-handler/webhook-handler.strategy.ts`**
- `INITIAL_PURCHASE(event)` — called when a user first subscribes via RevenueCat
- `RENEWAL(event)` — called on subscription renewals
- `NON_RENEWING_PURCHASE(event)` — one-time purchases
- Currently, ALL these methods only call `updateUserRevenueCatCache(event.app_user_id)` — **no email is sent**

### Stripe Webhook
**`apps/api-server/src/modules/subscription/controllers/webhooks/webhooks.controller.ts`**
- `handleStripeWebhooks()` handles Stripe events including `StripeEvents.CREATED` (new subscription)
- Currently only forwards the purchase to RevenueCat — **no email is sent**

### Email Infrastructure
- **SendGrid** is configured and used for transactional emails (`libs/send-grid/src/send-grid.service.ts`)
- **Brevo** is also configured (`libs/brevo/src/brevo.service.ts`) for another email provider
- **Email templates**: MJML + Handlebars templates exist in `apps/api-server/src/modules/email/templates/`
  - Layouts: `layouts/base.mjml`
  - Progress emails: `progress/weekly-progress.hbs`, `progress/no-progress.hbs`
  - Pages: `pages/manage-preferences.hbs`, `pages/unsubscribe.hbs`
- **Email Processor** (`email/services/email.processor.ts`) processes BullMQ jobs for sending emails
- **Template Compiler** (`email/services/email-template-compiler/email-template-compiler.service.ts`) handles Handlebars + MJML compilation

### Existing Template IDs (SendGrid)
```typescript
EMAIL_TEMPLATE_IDS = {
  TEAM_INVITE: 'd-a920d24eac1948adab718cb3f62556f2',
  VERIFY_EMAIL: 'd-d6cff2b375e54523b86061abebb8dbdf',
  // ... no THANK_YOU_SUBSCRIPTION template exists yet
}
```

### User Repository
Users can be looked up by `id` (RevenueCat `app_user_id` is the user's UUID).

## Implementation Steps

### 1. Create Thank-You Email Template
**New file:** `apps/api-server/src/modules/email/templates/subscription/thank-you.hbs`

Create a Handlebars template using the base MJML layout:
```handlebars
{{> base}}
{{#*inline "content"}}
  <mj-section>
    <mj-column>
      <mj-text>Hello {{userName}},</mj-text>
      <mj-text>Thank you for subscribing to Focus Bear! 🐻</mj-text>
      <mj-text>Your subscription is now active. You can start using all premium features right away.</mj-text>
      {{> cta-button url=dashboardUrl text="Open Focus Bear Dashboard"}}
      <mj-text>If you have any questions, reply to this email or visit our support at support@focusbear.io.</mj-text>
    </mj-column>
  </mj-section>
{{/inline}}
```

### 2. Add SendGrid template ID (or use dynamic template)
**File:** `apps/api-server/src/shared/utils/constants.ts`

Option A: Use a pre-built SendGrid dynamic template:
```typescript
EMAIL_TEMPLATE_IDS = {
  // ...existing...
  THANK_YOU_SUBSCRIPTION: 'd-XXXXXXXXXXXXXXXXXXXXXXXXXX', // Create in SendGrid dashboard
}
```

Option B: Use the existing MJML/Handlebars compiler to generate HTML and send via SendGrid's API (no new template ID needed). This is preferred for consistency with the existing email system.

### 3. Add `EmailTemplateCompilerService.compileThankYouEmail()` method
**File:** `apps/api-server/src/modules/email/services/email-template-compiler/email-template-compiler.service.ts`

```typescript
async compileThankYouEmail(data: { userName: string; dashboardUrl: string }): Promise<CompiledTemplate> {
  // Compile thank-you.hbs with MJML and return { subject, html, text }
  return this.compileTemplate('subscription/thank-you', {
    ...data,
    headerTitle: 'Thank you for subscribing!',
    headerSubtitle: 'Welcome to Focus Bear Premium',
    subject: 'Welcome to Focus Bear — your subscription is active! 🐻',
  });
}
```

### 4. Create `SubscriptionEmailService`
**New file:** `apps/api-server/src/modules/subscription/services/subscription-email/subscription-email.service.ts`

```typescript
@Injectable()
export class SubscriptionEmailService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sendGridService: SendGridService,
    private readonly emailTemplateCompilerService: EmailTemplateCompilerService,
  ) {}

  async sendThankYouEmail(userId: string): Promise<void> {
    const user = await this.userRepository.orm.findOneBy({ id: userId });
    if (!user?.email) return;

    const emailContent = await this.emailTemplateCompilerService.compileThankYouEmail({
      userName: user.display_name || user.email,
      dashboardUrl: process.env.DASHBOARD_URL || 'https://dashboard.focusbear.io',
    });

    await this.sendGridService.sendEmail({
      to: user.email,
      from: { email: 'support@focusbear.io', name: 'Focus Bear' },
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  }
}
```

### 5. Update `WebhookHandlerStrategy` to send thank-you email on `INITIAL_PURCHASE`
**File:** `apps/api-server/src/modules/subscription/services/webhook-handler/webhook-handler.strategy.ts`

```typescript
async INITIAL_PURCHASE(event) {
  await this.updateUserRevenueCatCache(event.app_user_id);
  // Send thank-you email for new subscriptions
  await this.subscriptionEmailService.sendThankYouEmail(event.app_user_id);
  return null;
}
```

Also consider sending for `NON_RENEWING_PURCHASE` (one-time purchases).

### 6. Update Stripe webhook handler to send thank-you email
**File:** `apps/api-server/src/modules/subscription/controllers/webhooks/webhooks.controller.ts`

After successful forwarding to RevenueCat on `StripeEvents.CREATED`:
```typescript
if (event.type === StripeEvents.CREATED && user) {
  await this.subscriptionEmailService.sendThankYouEmail(user.id);
}
```

Note: Be careful about double-sending — if both RevenueCat and Stripe webhooks fire for the same subscription, the user might receive two emails. Consider using a deduplication mechanism (e.g., a short-lived Redis key keyed on `stripe_subscription_id`).

### 7. Register `SubscriptionEmailService` in the module
**File:** `apps/api-server/src/modules/subscription/subscription.module.ts`

Add `SubscriptionEmailService` to providers and import `EmailModule`.

### 8. Handle email unsubscribe preference
Check `email_frequency` before sending:
```typescript
const emailPrefs = await this.userEmailPreferencesService.getPreferences(userId);
if (emailPrefs?.email_frequency === EmailFrequency.UNSUBSCRIBED) return;
```

## Files to Create/Modify

| File | Change |
|------|--------|
| New: `email/templates/subscription/thank-you.hbs` | Thank-you email Handlebars template |
| `email/services/email-template-compiler/email-template-compiler.service.ts` | Add `compileThankYouEmail()` method |
| New: `subscription/services/subscription-email/subscription-email.service.ts` | New service for subscription emails |
| `subscription/services/webhook-handler/webhook-handler.strategy.ts` | Call `sendThankYouEmail` in `INITIAL_PURCHASE` |
| `subscription/controllers/webhooks/webhooks.controller.ts` | Call `sendThankYouEmail` after Stripe purchase creation |
| `subscription/subscription.module.ts` | Register new service, import EmailModule |
| `shared/utils/constants.ts` | Add `THANK_YOU_SUBSCRIPTION` template ID (if using SendGrid templates) |

## Estimated Effort
**Small-Medium** — 4–8 hours. The email infrastructure already exists. Main work is creating the template and wiring up the webhook handler.

## Edge Cases / Risks
- **Double email**: If both RevenueCat (`INITIAL_PURCHASE`) and Stripe (`subscription.created`) webhooks fire, user gets two emails. Use idempotency key (e.g., check if a thank-you was already sent within last 24h by checking a flag or Redis key).
- **Team subscriptions**: The Stripe webhook already handles team plans separately (`payload.plan?.product === STRIPE_TEAM_PLAN_PRODUCT_ID`). Ensure thank-you email goes to the team owner, not individual team members.
- **Free trials**: If a user starts a free trial (not a paid subscription), the `INITIAL_PURCHASE` event may fire. Consider checking the subscription type before sending.
- **Email preferences**: Respect `email_frequency = UNSUBSCRIBED` — don't send if user has unsubscribed from all emails. Transactional emails (like subscriptions) are typically exempted from marketing unsubscribes, but check the UX policy.
- **Missing user email**: Users signing up via RevenueCat may not have an email in the DB yet. Add a null check.
- **Retry safety**: BullMQ jobs retry on failure — use SendGrid's idempotency headers or check for "already sent" before sending again.
- **Test environment**: `SendGridService.sendEmail` already filters test recipients — no risk of sending to real users in development.

---
🧘 Plan filed by Monk of Modularity (AI agent)
