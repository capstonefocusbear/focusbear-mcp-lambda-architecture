## Project local setup

### Prepare utilities and components for your OS and install it

1. Install NodeJS and npm (You need version 14.\* or higher of Node.js): https://nodejs.org/en/download/
2. Download Git: https://git-scm.com/downloads
3. Clone project repository. Take repository link from GitHub (Focus-Bear/backend) account.

```bash
$ git clone https://github.com/Focus-Bear/backend.git
```

### Third-party services local setup in Docker / Docker-compose

1. Download and install Docker daemon for your OS: https://www.docker.com/products/docker-desktop/
2. You can update docker-compose.yml with changed env vars if needed (can be used as it is)
3. Open Terminal in the project root and execute docker-compose.yml file:

```bash
$ docker-compose up --build
```

4. Two containers will be running: "Postgres" (common purpose DataBase) and "Adminer" (GUI for it)

### Server app startup

1. Create .env file in root of project

```bash
$ touch .env
```

2. Update environment variables (don't contain secure credentials) to .env file with this snippet

```bash
$ SERVER_PORT = 5038
$ SERVER_HOST = 127.0.0.1
$ NODE_ENV = 

# populate those variables with your local DB values to connect with
$ POSTGRES_PORT =
$ POSTGRES_HOST =
$ POSTGRES_USERNAME =
$ POSTGRES_PASSWORD =
$ POSTGRES_DB =

# this should be any randomly generated string (used for enciphering certain fields in DB)
$ TYPEORM_ENCRYPTION_KEY =

# randomly generated string used for encrypting DB columns related to calendars
$ FIELD_TRANSFORMER_ENCRYPTION_KEY =

# Got to the Auth0 dashboard, Application => Application, open "Server API" and take values to populate those keys
$ AUTH0_DOMAIN = dev-2hidr8ad.us.auth0.com
$ AUTH0_CONNECTION = Username-Password-Authentication
$ AUTH0_IDENTIFIER = https://dev-2hidr8ad.us.auth0.com/api/v2/
$ AUTH0_MANAGEMENT_CLIENT_ID =
$ AUTH0_MANAGEMENT_CLIENT_SECRET =
# only required for getting an access token locally
$ AUTH0_TEST_USER_PASSWORD =

# This is a custom randomly generated secret for Auth0 action (hook) usage, basically, it's not required locally because Auth0 cannot call localhost but it's critical on the Prod server. For local set up it can be skipped
$ AUTH0_ACTION_SECRET =

# Go to the Render.com account and take those secrets from there (those values are needed to test or change the CI\CD script in the .github folder, it's critical to have in it the GitHub and Prod server but optional for local server start up)
$ RENDER_SERVICE_ID=
$ RENDER_API_KEY=

# Get these from the Redis instance on render.com
$ REDIS_HOSTNAME =
$ REDIS_PORT =

# This should be retrieved from slack dashboard
$ SLACK_BACKEND_ALERTS_WEBHOOK =
$ SLACK_CUSTOMER_SUPPORT_WEBHOOK =
$ SLACK_WEBHOOKS_CHANNEL =
$ SLACK_UNINSTALL_FEEDBACK_CHANNEL =

# Go to the Pusher Channels account to take those values
$ PUSHER_APP_ID =
$ PUSHER_APP_KEY =
$ PUSHER_APP_SECRET =
$ PUSHER_APP_CLUSTER =

# Go to the Pusher Beams account to take those values
$ PUSHER_BEAMS_INSTANCE_ID =
$ PUSHER_BEAMS_PRIMARY_KEY =

# Take those for RevenueCat account
$ REVENUE_CAT_SECRET_KEY =
$ REVENUE_CAT_PUBLIC_KEY =

# Take those from Stripe account
$ STRIPE_SECRET_KEY =
$ STRIPE_CHECKOUT_SUCCESS_URL =
$ STRIPE_CHECKOUT_CANCEL_URL =
$ STRIPE_WEBHOOK_SECRET =

# Get this from the Brevo account
$ SENDINBLUE_MA_KEY =
$ BREVO_API_KEY =

# Get these from Sentry
$ SENTRY_DSN =
$ SENTRY_DEBUG =
$ SENTRY_ENV =
$ SENTRY_RELEASE =
$ SENTRY_LOG_LEVELS =

# Get this from the Google Developers dashboard
$ YOUTUBE_API_KEY =

# Get these from the Cloudflare R2 dashboard
$ R2_ENDPOINT =
$ R2_ACCESS_KEY_ID =
$ R2_SECRET_ACCESS_KEY =
$ R2_SIGNATURE_VERSION =

$ OPENAI_API_KEY =

# use local URL for local testing, use URL generated for staging server to test on staging
$ STAGING_SERVER_URL =

# Get from sendgrid Dashboard
$ SENDGRID_KEY =

# Can be any random string
$ JWT_INVITATION_SECRET =

#Get these from Zoho
$ ZOHO_CALLBACK_URL = should be URL of callback path for dashboard zoho login
$ ZOHO_CALLBACK_URL_DEVELOPMENT = https://dashboard.local.dev:3000/zohocallback
$ ZOHO_CLIENT_ID =
$ ZOHO_CLIENT_SECRET =

#Get these from Monday
$ MONDAY_CALLBACK_URL= should be URL of callback path for dashboard zoho login
$ MONDAY_CLIENT_ID=
$ MONDAY_CLIENT_SECRET=

#Get these from Jira
$ JIRA_CALLBACK_URL=should be URL of callback path for dashboard jira login
$ JIRA_CLIENT_ID=
$ JIRA_CLIENT_SECRET=

#Get these from Asana
$ ASANA_CALLBACK_URL=should be URL of callback path for dashboard asana login
$ ASANA_CLIENT_ID=
$ ASANA_CLIENT_SECRET=

#Get these from Clickup
$ CLICKUP_CALLBACK_URL=should be URL of callback path for dashboard clickup login
$ CLICKUP_CLIENT_ID=
$ CLICKUP_CLIENT_SECRET=

#Get these from Trello
$ TRELLO_CALLBACK_URL=should be URL of callback path for dashboard trello login
$ TRELLO_CLIENT_ID=
$ TRELLO_CLIENT_SECRET=
$ TRELLO_APP_NAME=

#Get these from Google
$ GOOGLE_CALLBACK_URL= should be URL of callback path for dashboard google login
$ GOOGLE_CLIENT_ID=
$ GOOGLE_CLIENT_SECRET=
$ GOOGLE_APP_NAME=

#Get these from Microsoft
$ MICROSOFT_CALLBACK_URL=should be URL of callback path for dashboard microsoft login
$ MICROSOFT_TENANT_ID=
$ MICROSOFT_CLIENT_ID=
$ MICROSOFT_CLIENT_SECRET=
$ MICROSOFT_APP_NAME=

```

3. Update .env file with actual values for PostgreSQL

- In case of using docker-compose - take values from docker-compose.yml
- If you don't use docker take values from your system

4. Install application dependencies

```bash
$ npm install
```

5. Go to project root and run migrations. Migrations will create all tables and seed data

```bash
$ npm run migration:up
```

6. Run app by executing one of commands. Depends on your needs

```bash
# Production mode
$ npm run start

# Dev mode
$ npm run start:dev

# Debug
$ npm run start:debug
```

7. Make sure the server is alive by querying GET http://127.0.0.1:5038/healthcheck in the Browser or curl

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

### Obtain an API access token

1. Navigate to `apps/api-server/test/integrations/auth0.e2e-spec.ts`
2. Replace test user email with your registered test account's email
3. Add AUTH0_TEST_USER_PASSWORD in .env file and use your test account's password as the value
4. Modify test file to console.log `tokenData` variable returned from `auth0LoginUser` function
5. Run

```bash
$ npm run test:e2e auth0.e2e
```

6. Copy access token from logged response
7. Remove console.log statement

### VS Code Extensions and Settings

#### 1. Docker - ms-azuretools.vscode-docker

#### 2. ESLint - dbaeumer.vscode-eslint

#### 3. Prettier - esbenp.prettier-vscode

#### 4. Code Spell Checker - streetsidesoftware.code-spell-checker

#### 5. Insert final new line

1.  Open Visual Studio Code and go to File (Code if using a Mac) -> Preferences -> Settings; you should now be viewing a settings page

2.  Enter 'insert final newline' in to the search bar

3.  Select the checkbox under the heading 'Files: Insert Final Newline' in the 'Workspace Settings' and/or 'User Settings' tab(s) as required

### Making DB Changes

When creating a new entity or altering an existing entity file's properties that represent DB columns,
a corresponding migration script needs to be created that will run to add new tables or make alterations to the the DB.

To create a new migration file, open the terminal and run

```bash
$ npm run migration:create {path-to-migration-folder}/{name-of-migration-script}
```

Example:

```bash
$ npm run migration:create ./apps/api-server/migrations/create-table-users
```

This will create a .ts file where both the UP and DOWN commands can be edited. Read more about this
in the TypeORM documentation https://orkhan.gitbook.io/typeorm/docs/migrations

After editing the newly created migration file, execute the script by running

```bash
$ npm run migration:up
```

This command will run all migration files that aren't already reflected in the DB

To revert a migration, run 
```bash
$ npm run migration:down
```
This reverts only the latest migration script reflected in the DB.

To see which migrations are already reflected in the DB, view the entries of the `migrations` table in your local or production DB.

### Running Unit Tests

To run all unit tests, open the terminal and run
```bash
$ npm run test
```
To run a specific file's unit tests, run
```bash
$ npm run test {file-name}
```
Example
```bash
$ npm run test user.service
```
The CI/CD pipeline set up in GitHub is set up to fail if unit test coverage is below 80%. To test coverage locally, run
```bash
$ npm run test:cov
```
This will output the coverage of each file and which lines aren't covered by existing unit tests.

When creating test files for services within the NestJS project scope, create the test file in the same folder as the service folder and append the file name with `.spec.ts`

### Render.com Hosting Provider

#### Adding env variables

1. From the dashboard, navigate to 'Env Groups' in the navigation bar
2. Open desired env group
3. Edit or add new variables

#### Linking an Env Group to a service

1. Navigate to the service's 'Environment' settings
2. Scroll down to 'Linked Env Groups'
3. Select and link the desired Env Group

#### Preview Environments

To test a new feature related to backend changes, a preview server can be set up that will be connected with a preview DB. To set up a preview environment, commit your changes to a feature branch and open a pull request to the main branch. Under the pull request's 'Conversation' tab, scroll to find a message similar to 'temporarily deployed to... eyst-backend-prod PR' and click on it to open the staging server's dashboard in Render. From here you'll be able to copy the staging server's URL, which will be in a similar format to `https://eyst-backend-prod-pr-710.onrender.com`. This process will also set up the preview database to which you can get login credentials by clicking on the message 'deployed to... - eyst-postgres' under the 'Conversation' tab as well.

The preview DB will be seeded with a test user and some additional records linked to them that can be used for testing. Seed scripts are located at `./apps/api-server/seeds`. For convenience, it's recommended to use the seed user's account registered in Focus Bear when getting an access token locally. (Ask for login credentials)

### Admin users

To set a user as admin, an admin role should be assigned to them from the Auth0 dashboard and their `user_type` field should be set to `ADMIN` in the users table in the DB.

### Testing Stripe Webhooks Locally

Stripe webhooks are used to register users in RevenueCat, handle subscription changes, and create teams after users subscribe from the dashboard. To test these features locally, navigate to the Stripe dashboard, click on "Developers" from the navigation bar, and then switch on "Test mode" from the navigation bar.

Navigate to API Keys and copy the public and secret keys to update your local .env variables.

Under the webhooks tab there should be a URL containing "ngrok", Ngrok will be used to expose your local server to the internet. Check how to set up ngrok locally at https://ngrok.com/docs/getting-started/

Start your local server then expose your local port using Ngrok.

Use the HTTPS protocol link returned from Ngrok to update the Ngrok webhook in the Stripe dashboard. After updating the link, enable the webhook. (Disable after use)

For any events that trigger the webhook, the local POST `/subscription/webhooks/stripe` endpoint will be called.









