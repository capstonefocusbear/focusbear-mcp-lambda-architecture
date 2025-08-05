# User Signup Approach in Focus Bear

This guide explains the user signup process for Focus Bear, covering both the Auth0-based flow and the public onboarding endpoint. It is intended for developers and integrators working with the Focus Bear backend and dashboard.

---

## 1. Auth0-Based Signup Flow

### Overview

- **Auth0** is used as the primary authentication provider.
- After a user signs up or logs in via Auth0, custom actions and rules are triggered to synchronize the user account with Focus Bear's backend.

### Steps

1. **User signs up or logs in via Auth0**

   - The user completes the signup or login form on the Focus Bear web or mobile app.

2. **Auth0 Action: Post Login**

   - An Auth0 Action ("Post Login") is triggered after successful authentication.
   - This action can be customized to perform additional logic, such as enriching the user profile or calling external APIs.

3. **Auth0 Rule: Sync User Account**

   - A custom Auth0 Rule ("Sync user account") is executed.
   - This rule calls the Focus Bear backend endpoint `/account-sync`, passing the user's Auth0 ID, email, and other relevant metadata.
   - The backend creates or updates the user in the Focus Bear database, ensuring the user is registered and has all necessary records (including Stripe customer, onboarding, etc.).

---

## 2. Public Onboarding Endpoint: `/user-onboarding/create-user`

### Overview

- This endpoint allows creation (or retrieval) of a user and their onboarding data with minimal requirements.
- It is designed for cases where only the user's email is available (e.g., when navigating from focusbear.io to the dashboard).
- It also ensures a Stripe customer is created for the user if needed.

### Steps

1. **User navigates from focusbear.io to dashboard/focusbear.io**

   - The frontend collects the user's email (e.g., from a signup form or query parameter).

2. **Call `/user-onboarding/create-user`**

   - The frontend sends a POST request to `/user-onboarding/create-user` with the user's email (and optionally, Auth0 client info).
   - Example request:
     ```json
     POST /user-onboarding/create-user
     {
       "email": "user@example.com"
     }
     ```

3. **Backend logic**

   - The backend checks if a user with the given email exists.
   - If not, it creates a new user record and a Stripe customer.
   - It also creates default onboarding data for the user (platform is always set to `Web`).
   - If the user already exists, it returns the existing user and onboarding data.

4. **Response**
   - The API returns the user ID and onboarding data.
   - Example response:
     ```json
     {
       "user_id": "uuid-here",
       "onboarding": {
         /* onboarding data */
       }
     }
     ```

### Key Points

- **Minimal requirements:** Only the user's email is required.
- **Idempotent:** Safe to call multiple times; will not create duplicate users.
- **Stripe integration:** Ensures every user has a Stripe customer record.
- **Onboarding:** Returns onboarding data for the web platform.

---

## Summary Table

| Flow                | Trigger              | Required Data   | Backend Endpoint               | Result                                    |
| ------------------- | -------------------- | --------------- | ------------------------------ | ----------------------------------------- |
| Auth0 (Action/Rule) | Auth0 login/signup   | Auth0 ID, email | `/account-sync`                | User created/updated, onboarding, Stripe  |
| Public Onboarding   | Dashboard navigation | Email           | `/user-onboarding/create-user` | User created/returned, onboarding, Stripe |

---

## When to Use Which Flow?

- **Auth0 flow:** Use when authentication is handled by Auth0 and you want to sync all user data after login/signup.
- **Public onboarding endpoint:** Use when you only have the user's email (e.g., marketing site, pre-auth flows) and want to create a user and onboarding data quickly.

---

For more details, see the backend API documentation or contact the Focus Bear engineering team.
