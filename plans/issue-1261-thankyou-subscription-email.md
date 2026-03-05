# Plan: Send Thank-You Email When User Pays for Subscription (Issue #1261)

## What the issue asks for

When a user successfully pays for a Focus Bear subscription (either via Stripe or RevenueCat), they should receive a "Thank you for subscribing!" email. This improves user experience and confirms the purchase.

## Raccoon feedback (applied)

- Create a raw MJML content fragment (not a full Handlebars template that uses `{{> base}}`). The codebase compiles MJML fragments and injects them into `email/templates/layouts/base.mjml` via `{{{content}}}`. The new template must follow that pattern (e.g., `subscription/thank-you.hbs` containing only the MJML fragment for `content`).
- Generalize `EmailTemplateCompilerService.getTemplate()` so callers can pass a full relative path like `getTemplate('subscription/thank-you', data)` instead of being hardcoded to `progress/`.
- Use only the RevenueCat `INITIAL_PURCHASE` webhook as the trigger for sending the thank-you email. Do NOT send from the Stripe webhook handler — Stripe events also cause RevenueCat `INITIAL_PURCHASE`, so using both produces double sends.
- Dispatch emails via existing BullMQ email queue (use `email.processor.ts`) rather than calling `sendGridService.sendEmail()` directly from webhook handlers.
- Add tests covering the new service, webhook integration point, and template compilation.

## Current State of the Code (summary)

- Webhook handler: `apps/api-server/src/modules/subscription/services/webhook-handler/webhook-handler.strategy.ts` — has `INITIAL_PURCHASE(event)` which currently only updates RevenueCat cache.
- Stripe webhook: `apps/api-server/src/modules/subscription/controllers/webhooks/webhooks.controller.ts` — forwards Stripe events to RevenueCat; currently no email is sent.
- Email infra: MJML + Handlebars templates, `EmailTemplateCompilerService`, and a BullMQ email processor exist.

## Implementation Steps (revised)

1) Template architecture — create a raw MJML content fragment

- New file: `apps/api-server/src/modules/email/templates/subscription/thank-you.hbs`
- This file must contain only the MJML fragment intended for `{{{content}}}` in `layouts/base.mjml`, for example:

```handlebars
<mj-section>
  <mj-column>
    <mj-text font-size="20px">Hello {{userName}},</mj-text>
    <mj-text>Thanks for subscribing to Focus Bear! 🐻</mj-text>
    <mj-button href="{{dashboardUrl}}">Open Focus Bear Dashboard</mj-button>
    <mj-text>If you have questions, reply to this email or visit support@focusbear.io.</mj-text>
  </mj-column>
</mj-section>
```

- Do NOT put `{{> base}}` or Handlebars partial directives in this file. The compiler will inject this fragment into `layouts/base.mjml`.

2) Generalize template compilation API

- Update `EmailTemplateCompilerService.getTemplate()` to accept a full relative path (e.g., `'subscription/thank-you'`) and not hardcode `progress/`.
- Ensure existing callers are updated to call `getTemplate('progress/weekly-progress', data)` or the new path format.

Suggested signature:
```ts
getTemplate(relativePath: string, data: Record<string, any>, options?: { withDeleted?: boolean })
```

3) Compose the thank-you email using compiler and enqueue

- Create `SubscriptionEmailService` (or update existing) to:
  - Look up the user by RevenueCat `app_user_id`
  - If user found and user.email exists and user hasn't opted out of transactional emails: compile template via `EmailTemplateCompilerService.getTemplate('subscription/thank-you', data)`
  - Enqueue an email job onto the existing email BullMQ queue (use the same job shape `email.processor.ts` expects) instead of calling `sendGridService.sendEmail()` directly.

Example (pseudocode):
```ts
const compiled = await emailTemplateCompiler.getTemplate('subscription/thank-you', { userName, dashboardUrl });
await emailQueue.add('SEND_EMAIL', {
  to: user.email,
  subject: compiled.subject,
  html: compiled.html,
  text: compiled.text,
});
```

4) Single webhook trigger — RevenueCat `INITIAL_PURCHASE` only

- Update the plan to use **only** the RevenueCat `INITIAL_PURCHASE` webhook as the canonical trigger for thank-you emails.
- Remove any plan to send from Stripe webhook handler. Rationale: Stripe-driven purchases also trigger RevenueCat `INITIAL_PURCHASE`, so sending from both causes double-send.
- If there are non-RevenueCat purchase flows in future, centralize dispatch into a single canonical path (e.g., an idempotent `SubscriptionEventProcessor`) that ensures one send per subscription.

5) Test plan

Minimum tests to add:
- `SubscriptionEmailService.sendThankYouEmail()`
  - user found & has email: assert an email job is enqueued with correct template data
  - user not found: no job enqueued
  - user found but no email / unsubscribed: no job enqueued

- `WebhookHandlerStrategy.INITIAL_PURCHASE()`
  - Assert it calls `updateUserRevenueCatCache()` and then calls `SubscriptionEmailService.sendThankYouEmail()` (use a spy/mocked service)
  - Test idempotency: repeated identical events within short window should not cause duplicate enqueues (mock Redis or job dedupe if implemented)

- Template compilation
  - `EmailTemplateCompilerService.getTemplate('subscription/thank-you', data)` compiles the MJML fragment into valid HTML and returns subject/html/text

6) Use BullMQ async dispatch (no direct SendGrid calls here)

- Ensure `email.processor.ts` already supports sending arbitrary compiled HTML templates. If not, update the processor to accept payloads of the form { to, from, subject, html, text } and call SendGrid/Brevo as usual.
- SubscriptionEmailService should only enqueue jobs.

7) Module registration

- Register `SubscriptionEmailService` in `subscription.module.ts` and import `EmailModule` / queue providers.

8) Edge cases and notes

- Double-send: avoided by using only RevenueCat `INITIAL_PURCHASE` as the trigger.
- Free trials: Consider whether `INITIAL_PURCHASE` should exclude trials; check RevenueCat event payload to detect trial vs paid.
- Transactional vs marketing unsubscribes: Respect user preferences as configured; transactional subscription confirmations may be treated as required (follow product policy).
- Missing email: If app_user_id exists but user has no email on record, skip sending.
- Idempotency / dedupe: Prefer a short Redis key (e.g., `thankyou:subscription:<revenuecat_transaction_id>`) set with TTL when sending to avoid duplicates on webhook retries.

## Files to Create / Modify (finalized)

- New: `apps/api-server/src/modules/email/templates/subscription/thank-you.hbs` (raw MJML fragment for insertion into layouts/base.mjml)
- Modify: `email/services/email-template-compiler/email-template-compiler.service.ts` — generalize `getTemplate()` and ensure it compiles MJML fragments into { subject, html, text }
- New: `subscription/services/subscription-email/subscription-email.service.ts` — compiles template and enqueues job onto email queue
- Modify: `subscription/services/webhook-handler/webhook-handler.strategy.ts` — call `subscriptionEmailService.sendThankYouEmail()` from `INITIAL_PURCHASE()` only
- Modify: `subscription/subscription.module.ts` — register service and queue providers
- (Optional) `email.processor.ts` — ensure it accepts compiled HTML jobs and calls SendGrid; if missing, add support

## Estimated Effort (revised)

**Small** — 3–6 hours. The codebase already has an email compiler and queue; main work is template creation, small compiler API change, enqueue wiring, and tests.

---

🧘 Plan revised by Monk of Modularity (AI agent) — applied Raccoon feedback: raw MJML fragment, generalized compiler API, single webhook trigger (RevenueCat INITIAL_PURCHASE), BullMQ dispatch, and test plan added.
