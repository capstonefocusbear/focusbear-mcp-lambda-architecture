<!-- e7a11e1a-bb37-4340-a933-1fd007edaec1 cbd7fbe3-3568-43be-a217-707d8407d048 -->
# Accountability Buddy Feature Implementation Plan

## Architecture Overview

The feature will be implemented as a new module following the existing team management pattern. The architecture follows a layered approach with clear separation of concerns: Entities → Repositories → Services → Controllers, adhering to SOLID principles.

## Database Schema Design

### 1. Accountability Buddy Table

Create `accountability_buddy` table to store buddy relationships:

- Primary key: `id` (UUID)
- Foreign keys: `user_id` (references users), `buddy_user_id` (nullable, references users)
- Encrypted fields: `buddy_email` (using BaseEntity.encryptField pattern)
- Status tracking: `invitation_status` (enum: PENDING, ACCEPTED, REJECTED, EXPIRED)
- Timestamps: `invitation_sent_at`, `invitation_responded_at`, standard created_at/updated_at
- Constraints: Unique constraint on (user_id, buddy_email) to prevent duplicates
- Indexes: On user_id, buddy_user_id, invitation_status for query performance

### 2. Unlock Request Table

Create `unlock_requests` table to track unlock requests:

- Primary key: `id` (UUID)
- Foreign keys: `user_id` (requester), `accountability_buddy_id` (references accountability_buddy)
- Request data: `requested_duration_minutes` (integer), `approved_duration_minutes` (nullable integer)
- Encrypted fields: `reason` (text), `buddy_message` (nullable text)
- Status: `status` (enum: PENDING, APPROVED, REJECTED, EXPIRED, USED)
- Timestamps: `expires_at` (calculated), `approved_at` (nullable), standard timestamps
- Indexes: On user_id, accountability_buddy_id, status, expires_at for efficient queries

### 3. Notification Entity Extension

Extend existing `Notification` entity in [apps/api-server/src/modules/notification/entities/notification.entity.ts](apps/api-server/src/modules/notification/entities/notification.entity.ts):

- Add `notification_type` enum field (CALENDAR_EVENT, ACCOUNTABILITY_BUDDY_INVITATION, UNLOCK_REQUEST, etc.)
- Add `action_url` field for deep linking to frontend routes
- Add `related_entity_id` and `related_entity_type` for polymorphic relationships

### 4. User Entity Relationship

Add relationship in [apps/api-server/src/modules/user/entities/user.entity.ts](apps/api-server/src/modules/user/entities/user.entity.ts):

- OneToMany relationship to AccountabilityBuddy entity

## Module Structure

Create new module at `apps/api-server/src/modules/accountability-buddy/` following the team module pattern:

### Directory Structure

- `entities/` - AccountabilityBuddy and UnlockRequest entities
- `domain/` - Enums (InvitationStatus, UnlockRequestStatus, NotificationType)
- `dto/` - Request/response DTOs for all endpoints
- `repositories/` - AccountabilityBuddyRepository, UnlockRequestRepository extending BaseRepository
- `services/` - AccountabilityBuddyService (main business logic)
- `controllers/` - AccountabilityBuddyController
- `accountability-buddy.module.ts` - Module definition with dependencies

## Service Layer Design (SOLID Principles)

### Single Responsibility Principle

- **AccountabilityBuddyService**: Handles buddy relationship management (invite, accept, list, delete)
- **UnlockRequestService**: Handles unlock request lifecycle (create, approve, reject, list)
- **AccountabilityNotificationService**: Handles notification creation for buddy events
- **AccountabilityEmailService**: Handles email template generation and sending
- **AccountabilityTokenService**: Handles JWT token generation and validation for invitations/approvals

### Open/Closed Principle

- Services use interfaces for external dependencies (Auth0ManagementService, EmailService)
- Repository pattern allows extension without modification
- DTOs provide contract for extension

### Liskov Substitution Principle

- Repositories extend BaseRepository, maintaining consistent interface
- Services can be mocked via interfaces for testing

### Interface Segregation Principle

- Separate interfaces for different concerns (email, token, notification)
- DTOs are specific to each operation

### Dependency Inversion Principle

- Services depend on repository abstractions, not concrete implementations
- External services (Auth0, Email) injected via dependency injection
- Configuration accessed through ConfigService abstraction

## API Endpoints Design

### Buddy Management Endpoints

1. **POST /accountability-buddy/invite**

- Validates user hasn't exceeded 5 buddy limit
- Creates AccountabilityBuddy record with PENDING status
- Checks Auth0 for existing user by email
- Generates invitation JWT token
- Sends email notification
- Creates in-app notification

2. **GET /accountability-buddy**

- Returns list of user's buddies with invitation status
- Includes buddy email, user_id (if accepted), timestamps

3. **POST /accountability-buddy/accept-invitation**

- Validates JWT token from query parameter
- Updates AccountabilityBuddy: sets buddy_user_id, status=ACCEPTED
- Creates notification for requester
- Returns success response

4. **DELETE /accountability-buddy/:id**

- Validates user owns the buddy relationship
- Soft deletes or marks as deleted
- Optionally notifies buddy

### Unlock Request Endpoints

5. **POST /accountability-buddy/unlock-request**

- Validates buddy relationship exists and is ACCEPTED
- Validates user hasn't exceeded pending request limit (3)
- Validates cooldown period (1 hour between requests)
- Creates UnlockRequest with PENDING status
- Fetches buddy email from Auth0
- Generates approval JWT token
- Sends email and creates notification for buddy

6. **GET /accountability-buddy/unlock-requests**

- Returns unlock requests based on user role:
- For requester: their requests with status
- For buddy: pending requests from users they're buddies with
- Filters out expired requests
- Supports pagination

7. **POST /accountability-buddy/unlock-request/:id/approve**

- Validates JWT token or authenticated user is the buddy
- Validates request is PENDING and not expired
- Updates UnlockRequest: status=APPROVED, approved_duration, expires_at, buddy_message
- Creates notification for requester
- Returns approval details

8. **GET /accountability-buddy/unlock-requests/status**

- Client polling endpoint
- Returns only APPROVED requests that are not expired
- Includes expires_at for client-side validation

## Integration Points

### Auth0 Integration

- Use `Auth0ManagementService.getAuth0User(auth0_id)` to fetch buddy email
- Use `Auth0ManagementService.getAuth0UsersWithEmail(email)` to check if buddy exists
- Integration point: [libs/auth0/src/services/auth0-management.service.ts](libs/auth0/src/services/auth0-management.service.ts)

### Email Service Integration

- Use existing SendGrid service via Bull queue
- Create email templates in SendGrid:
- ACCOUNTABILITY_BUDDY_INVITATION template
- UNLOCK_REQUEST_RECEIVED template
- UNLOCK_REQUEST_APPROVED template
- Integration point: [apps/api-server/src/modules/email/services/email.processor.ts](apps/api-server/src/modules/email/services/email.processor.ts)

### Notification Service Integration

- Extend NotificationService to support new notification types
- Create notifications for: invitation sent, invitation accepted, unlock request received, unlock request approved
- Integration point: [apps/api-server/src/modules/notification/services/notification.service.ts](apps/api-server/src/modules/notification/services/notification.service.ts)

### User Sync Integration

- Hook into user creation/sync flow to auto-link pending invitations
- When new user is created, query AccountabilityBuddy for matching email
- Link buddy_user_id but keep status as PENDING (requires explicit acceptance)
- Integration point: [apps/api-server/src/modules/user/services/user-settings/user-settings.service.ts](apps/api-server/src/modules/user/services/user-settings/user-settings.service.ts) or account-sync endpoint

### JWT Token Configuration

- Add new token secrets in config: `tokens.accountability_buddy_invitation.secret` and `tokens.unlock_request_approval.secret`
- Token expiry: 7 days for invitations, 24 hours for approval links
- Follow pattern from team invitations: [apps/api-server/src/modules/team/services/team-management/team-management.service.ts](apps/api-server/src/modules/team/services/team-management/team-management.service.ts)

## Security Considerations

### Data Encryption

- Encrypt buddy_email using BaseEntity.encryptField pattern
- Encrypt reason and buddy_message fields in unlock requests
- Follow encryption pattern from team module

### Authorization

- All endpoints require authentication via @UseGuards(IsAuth)
- Validate user ownership before operations (user can only manage their own buddies)
- Validate buddy relationship before unlock request creation
- Validate buddy ownership before approval

### Token Security

- Separate JWT secrets for different token types
- Include expiry in token payload
- Validate token signature and expiry on acceptance endpoints
- Store token secrets in environment configuration

### Rate Limiting

- Enforce max 5 buddies per user at service level
- Enforce max 3 pending unlock requests per user
- Enforce 1-hour cooldown between unlock requests
- Track invitation send counts to prevent spam

### Input Validation

- Email format validation
- Duration limits: min 1 minute, max 1440 minutes (24 hours)
- Reason field: max length validation, optional field
- Buddy message: max length validation

## Analytics Tracking

### Metrics to Track

- Number of buddy relationships created
- Invitation acceptance rate
- Unlock request frequency per user
- Average requested vs approved duration
- Request approval rate
- Time to approval
- Unlock usage rate (how often approved unlocks are actually used)

### Implementation Approach

- Add analytics events in service methods
- Consider creating AccountabilityBuddyEvent entity for detailed audit trail
- Track events: invitation_sent, invitation_accepted, invitation_rejected, unlock_requested, unlock_approved, unlock_rejected, unlock_used
- Store event data with timestamps and relevant metadata

## Migration Strategy

### Phase 1: Database Schema

1. Create migration for accountability_buddy table
2. Create migration for unlock_requests table
3. Create migration to extend notifications table
4. Add enum types for status fields
5. Create indexes for performance

### Phase 2: Core Entities and Repositories

1. Create AccountabilityBuddy entity
2. Create UnlockRequest entity
3. Create domain enums
4. Create repositories extending BaseRepository
5. Update User entity with relationship

### Phase 3: Service Layer

1. Implement AccountabilityBuddyService
2. Implement UnlockRequestService
3. Implement AccountabilityEmailService
4. Implement AccountabilityTokenService
5. Extend NotificationService for new types

### Phase 4: API Layer

1. Create DTOs for all endpoints
2. Implement AccountabilityBuddyController
3. Add validation and error handling
4. Add API documentation (Swagger)

### Phase 5: Integration

1. Integrate with Auth0 service
2. Integrate with email service
3. Integrate with notification service
4. Add user sync hook for auto-linking

### Phase 6: Testing and Refinement

1. Unit tests for services
2. Integration tests for endpoints
3. Test edge cases and error scenarios
4. Performance testing for queries

## Configuration Requirements

### Environment Variables

- Add JWT secrets for invitation and approval tokens
- Configure token expiry times
- Add rate limiting configuration values
- Email template IDs from SendGrid

### Constants

- Add to [apps/api-server/src/shared/utils/constants.ts](apps/api-server/src/shared/utils/constants.ts):
- Max buddies per user (5)
- Max pending unlock requests (3)
- Cooldown period (1 hour in milliseconds)
- Min/max unlock duration limits
- Email template IDs

## Error Handling

### Custom Exceptions

- AccountabilityBuddyLimitExceededException
- UnlockRequestLimitExceededException
- UnlockRequestCooldownException
- InvalidBuddyRelationshipException
- UnlockRequestExpiredException
- InvalidTokenException

### Error Responses

- Consistent error response format
- Appropriate HTTP status codes
- User-friendly error messages
- Logging to Sentry for monitoring

## Future Considerations

### Potential Enhancements (Not in Initial Implementation)

- Real-time notifications via Pusher/WebSockets
- Buddy groups or circles
- Different permission levels per buddy
- Unlock request history and analytics dashboard
- Buddy activity tracking
- Automated unlock approval rules+
-

### To-dos

- [ ] Create database migrations for accountability_buddy and unlock_requests tables with proper indexes and constraints
- [ ] Create AccountabilityBuddy and UnlockRequest entities with proper relationships and encrypted fields
- [ ] Create domain enums for InvitationStatus, UnlockRequestStatus, and NotificationType
- [ ] Create AccountabilityBuddyRepository and UnlockRequestRepository extending BaseRepository
- [ ] Extend Notification entity to support accountability buddy notification types
- [ ] Add OneToMany relationship from User to AccountabilityBuddy in User entity
- [ ] Implement AccountabilityTokenService for JWT generation and validation
- [ ] Implement AccountabilityEmailService for email template generation and sending
- [ ] Extend NotificationService to create accountability buddy notifications
- [ ] Implement AccountabilityBuddyService with invite, accept, list, and delete operations
- [ ] Implement UnlockRequestService with create, approve, reject, and list operations
- [ ] Create DTOs for all API endpoints with proper validation decorators
- [ ] Implement AccountabilityBuddyController with all endpoints and proper guards
- [ ] Create AccountabilityBuddyModule with all dependencies and exports
- [ ] Integrate Auth0ManagementService for fetching buddy emails and user lookup
- [ ] Add hook in user creation/sync flow to auto-link pending buddy invitations
- [ ] Add JWT secrets, rate limits, and email template IDs to configuration
- [ ] Implement custom exceptions and error handling for all service methods
- [ ] Add input validation for email, duration limits, and text field lengths
- [ ] Add analytics event tracking for buddy relationships and unlock requests