# Zapier and n8n Integration

This documents the webhook infrastructure for integrating Focus Bear with Zapier and n8n automation platforms.

## Overview

The webhook module provides:
- **Triggers**: Events that can start automations (habit completed, routine completed, focus session started/completed, break started/completed)
- **Actions**: API endpoints that automation platforms can call (start focus session, complete habit)
- **Authentication**: Auth0 OAuth 2.0 for secure access

## Architecture

### Webhook Event Types

| Event | Description | Payload |
|-------|-------------|---------|
| `habit.completed` | Fired when a user completes a habit/activity | `{ habit_name, routine_name, duration_seconds, completed_at }` |
| `routine.completed` | Fired when a user completes a routine | `{ routine_type, completed_at }` |
| `focus_session.started` | Fired when a focus session begins | `{ focus_mode_name, duration_minutes, started_at }` |
| `focus_session.completed` | Fired when a focus session ends | `{ focus_mode_name, duration_minutes, completed_at }` |
| `break.started` | Fired when a break begins | `{ break_type, started_at }` |
| `break.completed` | Fired when a break ends | `{ break_type, completed_at }` |

### External API Endpoints

All endpoints require Auth0 OAuth authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/external/v1/me` | Get current user info |
| `GET` | `/external/v1/focus-modes` | List user's focus modes |
| `GET` | `/external/v1/routines` | List user's routines with activities |
| `GET` | `/external/v1/streaks` | Get user's streak data |
| `POST` | `/external/v1/focus-session/start` | Start a focus session |
| `POST` | `/external/v1/habit/complete` | Mark a habit as completed |

### Webhook Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhooks/subscriptions` | Create a webhook subscription |
| `GET` | `/webhooks/subscriptions` | List user's subscriptions |
| `GET` | `/webhooks/subscriptions/:id` | Get subscription details |
| `PATCH` | `/webhooks/subscriptions/:id` | Update a subscription |
| `DELETE` | `/webhooks/subscriptions/:id` | Delete a subscription |

## Setting Up Zapier Integration

### Prerequisites

1. Auth0 tenant configured for Focus Bear
2. Zapier Developer account (https://developer.zapier.com)

### Step 1: Create Zapier App

1. Go to https://developer.zapier.com and create a new app
2. Set the app name (e.g., "Focus Bear")
3. Configure the app settings

### Step 2: Configure OAuth 2.0 Authentication

In the Zapier app authentication settings:

```
Authentication Type: OAuth 2.0
Authorization URL: https://YOUR_AUTH0_DOMAIN/authorize
Token URL: https://YOUR_AUTH0_DOMAIN/oauth/token
Scope: openid profile email
Client ID: [Your Auth0 Client ID for Zapier]
Client Secret: [Your Auth0 Client Secret for Zapier]
```

**Auth0 Configuration Required:**
1. Create a new Auth0 Application (type: Regular Web Application)
2. Add Zapier's redirect URL to Allowed Callback URLs: `https://zapier.com/dashboard/auth/oauth/return/App{APP_ID}CLIAPI/`
3. Enable the application for the Focus Bear API

### Step 3: Define Triggers

For each trigger, create a "REST Hook" trigger in Zapier:

**Example: Habit Completed Trigger**

Subscribe endpoint:
```
POST /webhooks/subscriptions
Body: {
  "name": "Zapier - Habit Completed",
  "url": "{{bundle.targetUrl}}",
  "event_types": ["habit.completed"]
}
```

Unsubscribe endpoint:
```
DELETE /webhooks/subscriptions/{{bundle.subscribeData.id}}
```

Perform List (for testing):
```
GET /external/v1/routines
```

### Step 4: Define Actions

**Example: Start Focus Session Action**

```
POST /external/v1/focus-session/start
Body: {
  "focus_mode_name": "{{bundle.inputData.focus_mode_name}}",
  "duration_minutes": {{bundle.inputData.duration_minutes}},
  "intention": "{{bundle.inputData.intention}}"
}
```

Input fields:
- `focus_mode_name` (required): Name of the focus mode to start
- `duration_minutes` (optional): Duration in minutes (default: 25)
- `intention` (optional): User's intention for the session

**Example: Complete Habit Action**

```
POST /external/v1/habit/complete
Body: {
  "habit_name": "{{bundle.inputData.habit_name}}",
  "routine_name": "{{bundle.inputData.routine_name}}",
  "duration_seconds": {{bundle.inputData.duration_seconds}}
}
```

Input fields:
- `habit_name` (required): Name of the habit to complete
- `routine_name` (required): Name of the routine containing the habit (morning_routine, evening_routine, break_routine)
- `duration_seconds` (optional): Time spent on the habit

## Setting Up n8n Integration

### Prerequisites

1. n8n instance (self-hosted or n8n.cloud)
2. Auth0 credentials for Focus Bear

### Step 1: Create OAuth2 Credentials

In n8n, go to Credentials → Add Credential → OAuth2 API:

```
Grant Type: Authorization Code
Authorization URL: https://YOUR_AUTH0_DOMAIN/authorize
Access Token URL: https://YOUR_AUTH0_DOMAIN/oauth/token
Client ID: [Your Auth0 Client ID]
Client Secret: [Your Auth0 Client Secret]
Scope: openid profile email
Auth URI Query Parameters: audience=YOUR_API_AUDIENCE
Authentication: Header
```

### Step 2: Create Webhook Triggers

Use the n8n Webhook node to receive events:

1. Add a Webhook node to your workflow
2. Copy the webhook URL
3. Use an HTTP Request node to subscribe:

```
POST https://api.focusbear.io/webhooks/subscriptions
Headers: Authorization: Bearer {{$credentials.oauth2Api.accessToken}}
Body: {
  "name": "n8n - Habit Completed",
  "url": "YOUR_N8N_WEBHOOK_URL",
  "event_types": ["habit.completed"]
}
```

### Step 3: Create Action Workflows

Use HTTP Request nodes to call Focus Bear actions:

**Start Focus Session:**
```
POST https://api.focusbear.io/external/v1/focus-session/start
Headers: Authorization: Bearer {{$credentials.oauth2Api.accessToken}}
Body: {
  "focus_mode_name": "Deep Work",
  "duration_minutes": 50
}
```

**Complete Habit:**
```
POST https://api.focusbear.io/external/v1/habit/complete
Headers: Authorization: Bearer {{$credentials.oauth2Api.accessToken}}
Body: {
  "habit_name": "Meditation",
  "routine_name": "morning_routine",
  "duration_seconds": 600
}
```

## Webhook Delivery

### Security

All webhook payloads are signed with HMAC-SHA256. The signature is included in the `X-Webhook-Signature` header.

To verify:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
const expectedSignature = `sha256=${signature}`;
// Compare with X-Webhook-Signature header
```

### Retry Logic

- Failed deliveries are retried up to 3 times
- Exponential backoff: 1 minute, 5 minutes, 15 minutes
- After 5 consecutive failures, the subscription is automatically disabled

### Payload Format

```json
{
  "event": "habit.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "habit_name": "Morning Meditation",
    "routine_name": "morning_routine",
    "duration_seconds": 600,
    "completed_at": "2024-01-15T10:30:00Z"
  }
}
```

## Follow-up Work Required

**Important**: The webhook infrastructure is in place, but event dispatching is not yet integrated into existing services. A follow-up PR is needed to:

1. Call `WebhookDispatcherService.dispatchEvent()` from `CompletedActivityService` when habits are completed
2. Call `WebhookDispatcherService.dispatchEvent()` from `FocusModeManagerService` when focus sessions start/end
3. Call `WebhookDispatcherService.dispatchEvent()` when breaks start/end
4. Call `WebhookDispatcherService.dispatchEvent()` when routines are completed

## Key Files

- `apps/api-server/src/modules/webhook/webhook.module.ts` - Module definition
- `apps/api-server/src/modules/webhook/controllers/external-api.controller.ts` - External API endpoints
- `apps/api-server/src/modules/webhook/controllers/webhook-subscription.controller.ts` - Subscription management
- `apps/api-server/src/modules/webhook/services/webhook-dispatcher.service.ts` - Event dispatching
- `apps/api-server/src/modules/webhook/domain/webhook-event-type.enum.ts` - Event type definitions
