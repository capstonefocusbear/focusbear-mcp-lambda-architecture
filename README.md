## Project local setup

### Prepare utilities and components for your OS and install it

1. Install NodeJS and npm (You need version 14.\* or higher of Node.js): https://nodejs.org/en/download/
2. Download Git: https://git-scm.com/downloads
3. Clone project repository. Take repository link from GitHub (Focus-Bear/backend) account.

```bash
$ git clone https://github.com/Focus-Bear/backend.git
```

### Third-party services local setup in Docker / Docker-compose

1. Download and install Docker daemon for youe OS: https://www.docker.com/products/docker-desktop/
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

# populate those variables with your local DB values to connect with
$ POSTGRES_PORT =
$ POSTGRES_HOST =
$ POSTGRES_USERNAME =
$ POSTGRES_PASSWORD =
$ POSTGRES_DB =

# this should be any randomly generated string (used for enciphering certain fields in DB)
$ TYPEORM_ENCRYPTION_KEY =

# Got to the Auth0 dashboard, Application => Application, open "Server API" and take values to populate those keys
$ AUTH0_DOMAIN = dev-2hidr8ad.us.auth0.com
$ AUTH0_CONNECTION = Username-Password-Authentication
$ AUTH0_INDENTIFIER = https://dev-2hidr8ad.us.auth0.com/api/v2/
$ AUTH0_MANAGEMENT_CLIENT_ID =
$ AUTH0_MANAGEMENT_CLIENT_SECRET =

# This is a custom randomly generated secret for Auth0 action (hook) usage, basically, it's uneeded locally because Auth0 cannot call localhost but it's critical on the Prod server. For local set up it can be skipped
$ AUTH0_ACTION_SECRET =

# Go to the Render.com account and take those secrets from there (those values are needed to test or change the CI\CD script in the .github folder, it's critical to have in it the GitHub and Prod server but optional for local server start up)
$ RENDER_SERVICE_ID=
$ RENDER_API_KEY=

# Get these from the Redis instance on render.com
$ REDIS_HOSTNAME = 
$ REDIS_PORT = 

# This should be retrieved from slack dashboard
$ SLACK_BACKEND_ALERTS_WEBHOOK = 
$ SLACK_WEBHOOKS_CHANNEL =

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

# Get this from the Sendinblue account
$ SENDINBLUE_MA_KEY = 

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

7. Make sure the server is alive quering GET http://127.0.0.1:5038/healthcheck in the Browser or curl

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
