# How to Test Zoho Integration Locally

This guide explains how to test Zoho integration in local development.

---

## Step 1: Create a Zoho Developer App

1. Go to Zoho API Console:
   https://api-console.zoho.com/

2. Click **Add Client**

3. Choose:

   - Client Type: Server-based Applications

4. Set:

   - Authorized Redirect URI:
     http://localhost:5038/auth/zoho/callback

5. After creating the app, copy:
   - Client ID
   - Client Secret

---

## Step 2: Create a Zoho Account and Project

1. Log in to Zoho Projects:
   https://projects.zoho.com/

2. Create:
   - A new portal (if needed)
   - A new project inside the portal

You will need:

- portal_id
- project_id

You can find them in the Zoho Projects URL.

---

## Step 3: Configure Local Environment

Add the following values to your `.env.local` file:

ZOHO_CALLBACK_URL=http://localhost:5038/auth/zoho/callback
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret

Restart the backend after updating `.env`.

---

## Step 4: Start Backend

npm run start:dev

Make sure backend is running on:

http://localhost:5038

---

## Step 5: Authenticate User (Get Bearer Token)

Open Bruno.

1. Choose the correct environment (e.g. dev).
2. Call Authentication API:
   POST {{token_endpoint}}
3. Copy the returned Bearer token.

You will use this token for all requests below.

---

## Step 6: Start Zoho OAuth Flow

In Bruno:

GET {{base_url}}/auth/zoho

- Add Authorization: Bearer <your_token>

It will return a Zoho authorization URL.

Open that URL in your browser.

---

## Step 7: Login to Zoho and Get Code

1. Log in with your Zoho account.
2. After login, you will be redirected to:

http://localhost:5038/auth/zoho/callback?code=…&location=us&accounts-server=https://accounts.zoho.com

Copy:

- code
- location
- accounts-server

---

## Step 8: Call Callback Endpoint Manually

In Bruno:

GET {{base_url}}/auth/zoho/callback

Query params:

- code
- location
- accounts-server

Add:

- Authorization: Bearer <your_token>

If successful, Zoho integration will be saved to database.

---

## Step 9: Fetch Zoho Projects

In Bruno:

GET {{base_url}}/integration/zoho/user-projects

Add:

- Authorization: Bearer <your_token>

Expected result:

- 200 OK
- List of Zoho projects

---

## Step 10: Sync Project

In Bruno:

POST {{base_url}}/integration/zoho/sync-project

Add:

- Authorization: Bearer <your_token>

Add body (JSON):

{
“portal_id”: “your_portal_id”,
“project_id”: “your_project_id”,
“only_assigned”: false
}

Expected result:

- 201 Created
- Project and child tasks synced successfully

---

## Common Errors

### 401 Unauthorized

Make sure:

- You added Bearer token
- Token is not expired

### 500 Error (Cannot read properties of null)

Make sure:

- `@UseGuards(IsAuth)` is enabled
- Authorization header is included

---

## Summary Flow

1. Authenticate user
2. Start Zoho OAuth
3. Login and get code
4. Call callback endpoint
5. Fetch projects
6. Sync project

If all steps succeed, Zoho integration is working locally.
