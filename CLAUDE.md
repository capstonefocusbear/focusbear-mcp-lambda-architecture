# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Lint Commands

```bash
# Install dependencies
npm install

# Development (watches for changes)
npm run start:dev

# Development with debugger
npm run start:debug

# Production (runs migrations automatically)
npm start

# Build all (API + cron jobs + assets)
npm run build

# Run all unit tests
npm test

# Run a specific test file
npm test user.service

# Run tests in watch mode
npm run test:watch

# Run tests in debug mode
npm run test:debug

# Run e2e tests
npm run test:e2e

# Run specific e2e test
npm run test:e2e auth0.e2e

# Test coverage (80% threshold enforced)
npm run test:cov

# Lint and auto-fix
npm run lint

# Format code
npm run format

# Prompt safety tests
npm run test:url-prompts
npm run test:app-prompts

# Smoke tests (requires server running; default http://localhost:5038)
npm run smoke-test
```

## Database Commands

```bash
# Run pending migrations
npm run migration:up

# Revert last migration
npm run migration:down

# Create a new migration
npm run migration:create ./apps/api-server/migrations/{migration-name}

# Generate migration from entity changes
npm run migration:generate ./apps/api-server/migrations/{migration-name}

# Run data migrations (separate from schema migrations)
npm run data:migration:run

# Seed database with test data
npm run seed
```

**Migration Note**: Keep DataSource `migrationsTransactionMode` as `'none'`. For migrations that need `CREATE INDEX CONCURRENTLY`, set `transaction = false` on the migration class.

## Cron Jobs Reference

```bash
# Notification & Engagement
npm run cron:routine-push-notifications  # Push notifications for routine reminders
npm run cron:calendar-event-notifications  # Calendar event reminders
npm run cron:data-sync-notification  # Data sync status notifications

# Calendar & Events
npm run cron:events  # Sync calendar events
npm run cron:pusher  # Pusher service maintenance

# Stats & Analytics
npm run cron:user-daily-stats  # Calculate daily user statistics

# Cleanup & Maintenance
npm run cron:expired-team-members  # Remove expired team members
npm run cron:expired-unlock-requests  # Clean up expired unlock requests
npm run cron:expired-invitations  # Clean up expired invitations

# Progress Emails (run from dist/)
npm run cron:daily  # Daily progress emails
npm run cron:weekly  # Weekly progress emails
npm run cron:monthly  # Monthly progress emails
npm run cron:no-progress  # No progress reminder emails

# Data Sync
npm run cron:activity-template-embedding-sync  # Sync activity template embeddings for RAG
```

**Note**: Most cron jobs use `ts-node` for development. Progress email crons run from built `dist/` directory for production readiness.

## Architecture Overview

### Monorepo Structure

- **apps/api-server**: Main NestJS Fastify application (entrypoint: `src/main.ts`)
- **libs/**: Shared libraries imported via `@app/*` path aliases
- **cron-jobs/**: Scheduled background workers

### Path Aliases

- `@app/{lib-name}` → `libs/{lib-name}/src` (e.g., `@app/stripe`, `@app/auth0`, `@app/openai`)
- `@api-server/*` → `apps/api-server/src/*`

### Shared Libraries (libs/)

| Library             | Purpose                                  |
| ------------------- | ---------------------------------------- |
| auth0               | Auth0 authentication/management          |
| stripe              | Payment processing                       |
| openai              | OpenAI API integration                   |
| gemini              | Google Gemini AI integration             |
| pusher/pusher-beams | Real-time messaging & push notifications |
| r2                  | Cloudflare R2 storage                    |
| send-grid/brevo     | Email services                           |
| crypto              | Encryption utilities                     |
| observability       | Sentry integration                       |
| jwt                 | JWT utilities                            |

### Module Structure Pattern

Each feature module in `apps/api-server/src/modules/` typically contains:

```
{module}/
├── controllers/      # HTTP endpoints
├── services/         # Business logic
├── entities/         # TypeORM entities
├── repositories/     # Data access layer
├── dto/              # Request/response DTOs
├── domain/           # Domain types/interfaces
├── consumers/        # Bull queue consumers (if applicable)
└── {module}.module.ts
```

### Shared Code (apps/api-server/src/shared/)

- `entities/`: Base entities and common entity definitions
- `decorators/`: Custom decorators
- `interceptors/`: HTTP interceptors
- `exceptions/`: Custom exception classes
- `utils/`: Utility functions and constants
- `i18n/`: Internationalization files

## API Patterns

### Swagger Documentation

- Use `@ApiTags('module')`, `@ApiOperation()`, `@ApiResponse()` on controllers
- Use `@ApiSecurity('Auth0AccessToken')` for authenticated endpoints
- DTOs automatically generate request/response schemas via nest-cli.json plugin

### Common Decorators

**@AuthContext** - Extract authenticated user:

```typescript
import { AuthContext } from '@api-server/shared/decorators/passport.decorator';
import { Passport } from '@api-server/modules/auth/domain/passport.model';

@Get()
async getUser(@AuthContext() { user }: Passport) {
  // user.id, user.email available
}
```

**@RawBody** - Access raw request body (for webhook signature verification):

```typescript
import { RawBody } from '@api-server/shared/decorators/raw-body.decorator';

@Post('webhook')
async handleWebhook(@RawBody() rawBody: Buffer) {
  // Verify signature using raw body
}
```

### Validation

- All DTOs use `class-validator` decorators (`@IsString()`, `@IsEmail()`, etc.)
- Custom validators in `apps/api-server/src/shared/decorators/`
- Examples: `@IsValidCutoffTime()`, `@IsPublicWebhookUrl()`
- Global validation pipe auto-validates and transforms requests

### Guards

- `IsAuth` - Requires authenticated user (must come before other guards like `IsAdmin`)
- `ServiceAccountAuth` - Service-to-service authentication

### Reference Files

- Controller example: [apps/api-server/src/modules/user/controllers/user-data/user-data.controller.ts](apps/api-server/src/modules/user/controllers/user-data/user-data.controller.ts)
- Decorators: [apps/api-server/src/shared/decorators/](apps/api-server/src/shared/decorators/)

## Queue System (BullMQ)

### Architecture

- Redis-backed async job processing using BullMQ/Bull
- Queue names: `BullQueues` enum in [apps/api-server/src/shared/utils/constants.ts:170](apps/api-server/src/shared/utils/constants.ts#L170)
- Worker names: `BullWorkers` enum in [apps/api-server/src/shared/utils/constants.ts:195](apps/api-server/src/shared/utils/constants.ts#L195)

### Dispatching Jobs (Producer Pattern)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { BullQueues, BullWorkers } from '@api-server/shared/utils/constants';

@Injectable()
export class MyService {
  constructor(@InjectQueue(BullQueues.ACTIVITY_IMAGE) private queue: Queue) {}

  async dispatchJob(data: any) {
    await this.queue.add(BullWorkers.DELETE_ACTIVITY_IMAGE, data);
  }
}
```

### Consuming Jobs (Consumer Pattern)

```typescript
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { BullQueues, BullWorkers } from '@api-server/shared/utils/constants';

@Processor(BullQueues.ACTIVITY_IMAGE)
export class ImageConsumer {
  @Process(BullWorkers.DELETE_ACTIVITY_IMAGE)
  async handleJob(job: Job<JobData>) {
    const { data } = job;
    // Process the job
  }
}
```

### Module Registration

Register queues in module imports:

```typescript
BullModule.registerQueue({ name: BullQueues.ACTIVITY_IMAGE });
```

Register consumers as providers in the module.

### Common Queues

- `ACTIVITY_IMAGE` - Image processing and deletion
- `COMPLETED_ACTIVITY` - Activity completion processing
- `HABIT_IMPORT` - Bulk habit imports
- `WEBHOOK` - Outbound webhook delivery
- `EMAIL_VERIFICATION` - Email verification jobs
- `EMOJI_GENERATION` - AI emoji generation

### Reference Files

- Queue constants: [apps/api-server/src/shared/utils/constants.ts:170-220](apps/api-server/src/shared/utils/constants.ts#L170-L220)
- Consumer example: [apps/api-server/src/modules/activity/consumers/activity-image.consumer.ts](apps/api-server/src/modules/activity/consumers/activity-image.consumer.ts)

## Database Patterns

### Base Entity

All entities extend `BaseEntity` which provides:

- `id` (UUID primary key, auto-generated by default)
- `created_at`, `updated_at` (timestamptz with automatic tracking)
- `encryptField()`, `encryptJSONField()` for field-level encryption

### Encrypted Fields

```typescript
import { BaseEntity } from '@api-server/shared/entities/base-entity.entity';
import { Entity, Column } from 'typeorm';

@Entity('users')
export class User extends BaseEntity {
  @Column({
    type: 'text',
    transformer: User.encryptField('user_sensitive_data'),
  })
  sensitive_data: string;

  @Column({
    type: 'jsonb',
    transformer: User.encryptJSONField('user_json_data'),
  })
  json_data: any;
}
```

### Repository Pattern

- Extend `BaseRepository<T>` for common CRUD operations (create, update, upsert)
- Custom queries in dedicated repository classes
- Example: [apps/api-server/src/shared/repositories/base-repository.repository.ts](apps/api-server/src/shared/repositories/base-repository.repository.ts)

### Migrations

- This project sets `migrationsTransactionMode: 'none'` in typeorm.config, so migrations run without a wrapping transaction by default.
- For migrations that need `CREATE INDEX CONCURRENTLY`, export `transaction = false` from the migration file.
- Example: [apps/api-server/migrations/1759217602679-userEndpointIndexing.ts](apps/api-server/migrations/1759217602679-userEndpointIndexing.ts)

### Soft Deletes

Some entities support soft delete patterns using `@DeleteDateColumn()`:

```typescript
@DeleteDateColumn()
deleted_at?: Date;
```

Access via `BaseCRUDService.softDelete(id)` method.

### Authentication

- User authentication via Auth0 JWT with `PassportMiddleware`
- Service account (M2M) authentication via `ServiceAccountPassportMiddleware` for `/service-account/*` routes
- Guards: `ServiceAccountAuth` for machine-to-machine endpoints

### Background Jobs

- BullMQ queues for async tasks (Redis-backed)
- Cron jobs run via `ts-node` in dev or built artifacts in production
- Common crons: progress emails, calendar sync, notifications, expired member cleanup

## Code Style

- TypeScript with ES2017 target
- Prettier + ESLint (Airbnb TypeScript config)
- Files must end with newline (`eol-last: always`)
- DTOs suffix with `Dto`, tests with `.spec.ts` or `.e2e-spec.ts`
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- Pre-commit hooks run npm audit, Prettier, and ESLint via Husky

## Testing

- Unit tests co-located with source files as `*.spec.ts`
- E2E tests in `apps/api-server/test/` as `*.e2e-spec.ts`
- Test mocks in `apps/api-server/test/mocks/`
- Coverage collected from `*.service.ts`, `*.guard.ts`, `*.strategy.ts`, `*.middleware.ts`
- Prompt safety evaluations in `apps/api-server/test/prompt-testing/` using promptfoo

## Local Development Setup

1. Copy `.env.example` to `.env` and configure values
2. Start PostgreSQL and Redis via Docker: `docker-compose up -d`
3. Run migrations: `npm run migration:up`
4. Start server: `npm run start:dev`
5. Health check: `GET http://127.0.0.1:5038/healthcheck`

## Tools

- Always use context7 when I need code generation, setup or configuration steps, or
  library/API documentation. This means you should automatically use the Context7 MCP
  tools to resolve library id and get library docs without me having to explicitly ask.
