# Focus Bear Integrations

This directory contains configuration files for integrating Focus Bear with third-party automation platforms.

## Zapier Integration

The `zapier/focus-bear-zapier-app.json` file contains the Zapier app definition that can be used to create a Zapier integration.

### Setup Instructions

1. Create a new Zapier app at https://developer.zapier.com/
2. Replace the placeholder values in the JSON file:
   - `{{AUTH0_DOMAIN}}` - Your Auth0 domain (e.g., `your-tenant.auth0.com`)
   - `{{CLIENT_ID}}` - Your Auth0 application client ID
   - `{{CLIENT_SECRET}}` - Your Auth0 application client secret
   - `{{API_BASE_URL}}` - Your Focus Bear API base URL (e.g., `https://api.focusbear.io`)
3. Import the configuration or use it as a reference for building your Zapier app

### Available Triggers

- **Habit Completed** - Fires when a user completes a habit
- **Routine Completed** - Fires when a user completes a morning or evening routine
- **Focus Session Started** - Fires when a user starts a focus session
- **Focus Session Completed** - Fires when a user completes a focus session
- **Break Started** - Fires when a user starts a break
- **Break Completed** - Fires when a user completes a break

### Available Actions

- **Start Focus Session** - Starts a new focus session with a specified focus mode
- **Complete Habit** - Marks a habit as completed within a routine

## n8n Integration

The `n8n/focus-bear-n8n-workflow.json` file contains a sample n8n workflow that demonstrates how to receive and process Focus Bear webhook events.

### Setup Instructions

1. Open your n8n instance
2. Go to Workflows > Import from File
3. Select the `focus-bear-n8n-workflow.json` file
4. Configure the webhook URL in Focus Bear to point to your n8n webhook endpoint
5. Customize the workflow to add your desired actions (e.g., send Slack messages, update spreadsheets, etc.)

### Webhook Events

The workflow is configured to receive the following events:

- `habit.completed` - When a habit is completed
- `routine.completed` - When a routine is completed
- `focus_session.started` - When a focus session starts
- `focus_session.completed` - When a focus session ends
- `break.started` - When a break starts
- `break.completed` - When a break ends

### Webhook Payload Format

All webhook events follow this format:

```json
{
  "event_type": "habit.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "user_id": "user_123",
  "data": {
    // Event-specific data
  }
}
```

### Security

Webhooks are signed using HMAC-SHA256. The signature is included in the `X-Webhook-Signature` header. Verify the signature by computing HMAC-SHA256 of the request body using your webhook secret.

## Auth0 Configuration

Both integrations use Auth0 OAuth 2.0 for authentication. You need to:

1. Create a new Auth0 application (Regular Web Application)
2. Configure the allowed callback URLs for Zapier/n8n
3. Enable the required scopes: `openid`, `profile`, `email`, `offline_access`
4. Note down the Client ID and Client Secret for use in the integration configurations
