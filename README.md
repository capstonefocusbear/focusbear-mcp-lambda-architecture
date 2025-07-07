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

2. Copy environment variables from .env.example to .env
3. Update .env file with actual values for PostgreSQL and Redis

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

### Setting Up Development with Auth0

> **Disclaimer**: This setup guide is intended for creating a new Auth0 account for development purposes. If you are using the staging environment, an existing Auth0 account configuration has already been provided in `.env.sample`.

#### 1. Setting Up OAuth Application on Auth0

1. Navigate to the [Auth0 dashboard](https://manage.auth0.com/dashboard) and log in. Create an account if you don't have one.
2. On the dashboard, create a new **Regular Web Application**.
3. Enable the **Password** grant type:
   - Scroll down to **Advanced Settings**.
   - Go to the **Grant Types** tab and select **Password**.
4. Copy the following details from the application settings:
   - Domain
   - Client ID
   - Client Secret
5. Replace these values in your `.env` file:
   - `AUTH0_DOMAIN`
   - `AUTH0_MANAGEMENT_CLIENT_ID`
   - `AUTH0_MANAGEMENT_CLIENT_SECRET`

#### 2. Adding Users on the Auth0 Dashboard

1. Navigate to the **Auth0 dashboard**.
2. Go to the **User Management** section.
3. Click the **Create User** button.
4. Enter the email address and password for the new user.
5. You can view the newly created user in the **User Management** section.

### Obtain an API access token

#### Option 1

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

#### Option 2

Use API collection, make sure to update collection environment with the appropriate value e.g. auth domain, client id, client secret... [See API request collection section for more details](#api-requests-collections)

### VS Code Extensions and Settings

#### 1. Docker - ms-azuretools.vscode-docker

#### 2. ESLint - dbaeumer.vscode-eslint

#### 3. Prettier - esbenp.prettier-vscode

#### 4. Code Spell Checker - streetsidesoftware.code-spell-checker

#### 5. Insert final new line

1. Open Visual Studio Code and go to File (Code if using a Mac) -> Preferences -> Settings; you should now be viewing a settings page
2. Enter 'insert final newline' in to the search bar
3. Select the checkbox under the heading 'Files: Insert Final Newline' in the 'Workspace Settings' and/or 'User Settings' tab(s) as required

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

To connect to the production database locally, update .env config for database connection and set `ssl: true` in `apps/api-server/src/config/typeorm.config.ts` before starting local server.

### API Requests Collections

Bruno, an alternative to Postman, is used to create the API collections. To get started, ensure that Bruno is installed. Link to the executable can be found [here](https://www.usebruno.com/downloads).

The collection contains two environments: one for local development and one for production. You can modify the values as needed.

Run the auth request first to generate the JWT token that will be used for the following requests.

#### Getting Started with Bruno

1. **Install Bruno**:

   - Download and install Bruno from the [official website](https://www.usebruno.com/downloads).

2. **Import the Collection**:

   - Open Bruno and import the provided API collection file.

3. **Configure Environments**:

   - The collection includes two environments: `local` and `production`.
   - Modify the environment variables to match your setup.

4. **Collection Documentation**:

   - After importing the collection, navigate to the **Docs** tab within Bruno.
   - The **Docs** tab provides detailed information about each endpoint, including descriptions, request parameters, and example responses.
   - Use this documentation to understand how to interact with the API and to see examples of how to structure your requests.

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

### Admin users

To set a user as admin, an admin role should be assigned to them from the Auth0 dashboard and their `user_type` field should be set to `ADMIN` in the users table in the DB.

### Testing Stripe Webhooks Locally

Stripe webhooks are used to register users in RevenueCat, handle subscription changes, and create teams after users subscribe from the dashboard. To test these features locally, navigate to the Stripe dashboard, click on "Developers" from the navigation bar, and then switch on "Test mode" from the navigation bar.

Navigate to API Keys and copy the public and secret keys to update your local .env variables.

Under the webhooks tab there should be a URL containing "ngrok", Ngrok will be used to expose your local server to the internet. Check how to set up ngrok locally at https://ngrok.com/docs/getting-started/

Start your local server then expose your local port using Ngrok.

Use the HTTPS protocol link returned from Ngrok to update the Ngrok webhook in the Stripe dashboard. After updating the link, enable the webhook. (Disable after use)

For any events that trigger the webhook, the local POST `/subscription/webhooks/stripe` endpoint will be called.

### Example Video of Making Change

[Google Doc containing video links](https://docs.google.com/document/d/1ZiiIcFibBE3fQXuY18tFXiIoSFqq1mfYo6CQkzpZgEk/edit?usp=sharing)

## Managing Secrets and Environment Variables for Backend Services on Production build

### How to Add a Secret for Backend Services
To securely add a new secret for backend services, follow these steps:

1. **Open AWS Secrets Manager**
   - Log in to the AWS Management Console.
   - Navigate to Secrets Manager.
2. **Add or Update the Secret through AWS Console or CLI**
   - Locate the secret named `/prod/backend`.
   - Add a new key-value pair for your secret, or update an existing one as needed.
3. **Register the Secret Key in the Infra Codebase**
   - Go to the [aws-infra repository](https://github.com/Focus-Bear/aws-infra).
   - Open the file: [`const/secret-config/backend-secrets-config.ts`](https://github.com/Focus-Bear/aws-infra/blob/main/const/secret-config/backend-secrets-config.ts).
   - Add your new key to the `BACKEND_SECRET_ENV_KEYS` enum, as appropriate.
4. **Submit Your Changes**
   - Commit your code changes.
   - Create a Pull Request (PR) for review.

> **Note:**
> - Ensure your secret key name matches exactly in both AWS Secrets Manager and the codebase.
> - Never commit actual secret values to the repository.

### How to Add a Non-Secret Environment Variable for Backend Services
To add a new non-secret environment variable for backend services, follow these steps:

1. **Open AWS Systems Manager (SSM) Parameter Store**
   - Log in to the AWS Management Console.
   - Navigate to Systems Manager → Parameter Store.
2. **Add or Update the Parameter through AWS Console or CLI**
   - Create a new parameter or update an existing one.
   - Use the path format: `/prod/backend/<your_variable_name>`
   - Set the appropriate value for your environment variable.
3. **Register the Environment Variable in the Codebase**
   - Go to the [aws-infra repository](https://github.com/Focus-Bear/aws-infra).
   - Open the file: [const/env-config/backend-env-variable.ts](https://github.com/Focus-Bear/aws-infra/blob/main/const/env-config/backend-env-variable.ts).
   - Add your new key to the `BACKEND_CONFIG_ENV_KEYS` enum.
   - Add the corresponding entry to the `BACKEND_ENV_PATHS` object with the SSM path and provided status.
4. **Submit Your Changes**
   - Commit your code changes.
   - Create a Pull Request (PR) for review.

> **Note:**
> - Ensure your parameter path matches exactly in both AWS SSM Parameter Store and the codebase.
> - Non-secret environment variables are stored in SSM Parameter Store, while secrets are stored in AWS Secrets Manager.
> - The `provided` field in `BACKEND_ENV_PATHS` indicates whether the value is provided by the infrastructure (`false`) or manually set (`true`).
