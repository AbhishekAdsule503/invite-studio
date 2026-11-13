# Database Architecture & Schema Documentation

INVITE STUDIO uses **PostgreSQL** with **Prisma ORM**.

## Schema Models Overview

### 1. `User`
- **Purpose**: Represents hosts and Super Admins.
- **Key Fields**: `id` (UUID), `mobile` (Unique E.164 string), `role` (`HOST` or `SUPER_ADMIN`), `isActive`.
- **Tenant Scope**: Top-level tenant. Every user owns their own data.

### 2. `Guest` ("My Guests")
- **Purpose**: Permanent, reusable guest address book for a host.
- **Key Fields**: `id`, `userId` (FK -> `User`), `fullName`, `whatsappNumber`, `email`, `relation`, `address`, `isPermanent`.
- **Multi-Tenant Rule**: Scoped to `userId`. Cascade deleted if user is deleted.

### 3. `Event`
- **Purpose**: An occasion organized by a host (e.g. Wedding, Birthday, Anniversary).
- **Key Fields**: `id`, `userId` (FK -> `User`), `name`, `eventType`, `eventDate`, `eventTime`, `venue`, `rsvpDeadlineType`, `rsvpDeadlineDate`, `rsvpDeadlineDaysBefore`.
- **Deadline Logic**: Supports exact date/time or X days prior to event.

### 4. `EventGuest`
- **Purpose**: Represents an invitee for a specific event.
- **Key Fields**: `id`, `eventId` (FK -> `Event`), `guestId` (FK -> `Guest`, nullable), `name`, `whatsappNumber`, `email`, `relation`.
- **Relationship Rule**:
  - If linked to an existing "My Guest", `guestId` references the permanent record.
  - If added as "Event Only", `guestId` is `null` and guest details live directly on `EventGuest`.
  - Removing an `EventGuest` sets `guestId` to null or deletes the junction record, **never** deleting the permanent `Guest`.

### 5. `InvitationTemplate`
- **Purpose**: Pre-made and custom visual templates for invitations.
- **Key Fields**: `id`, `title`, `eventType`, `previewImageUrl`, `contentHtml`, `defaultMessage`, `isSystem`, `userId` (nullable).
- **Access Rule**: System templates (`isSystem=true`) are readable by all users; custom templates are owned by specific users or Super Admins.

### 6. `Invitation`
- **Purpose**: The personalized invite generated for an `EventGuest`.
- **Key Fields**: `id`, `eventId`, `eventGuestId` (1-to-1), `templateId`, `token` (Unique unguessable token for RSVP link), `personalizedMessage`, `whatsappStatus` (`PENDING`, `SENT`), `sentAt`.
- **Public URL**: `/invite/:token` (uses random unguessable token, never database primary key).

### 7. `RsvpResponse`
- **Purpose**: Stores an invitee's attendance response.
- **Key Fields**: `id`, `invitationId` (1-to-1), `status` (`IN`, `OUT`), `companionCount`, `respondedAt`.
- **CRITICAL PRIVACY RULE**:
  - The host dashboard query computes `COUNT(*)` grouped by `status`.
  - The host API **never** selects or returns individual `RsvpResponse` rows or links responses to guest names.

### 8. `SubscriptionPlan`
- **Purpose**: Commercial plans (e.g., Free Trial, Basic Yearly, Pro Yearly).
- **Key Fields**: `id`, `name`, `code` (Unique), `priceYearly`, `currency`, `maxEvents`, `maxGuestsPerEvent`, `canUploadCustomTemplates`.

### 9. `UserSubscription`
- **Purpose**: Active subscription status for a host.
- **Key Fields**: `id`, `userId` (Unique), `planId`, `status` (`ACTIVE`, `TRIAL`, `EXPIRED`, `CANCELLED`), `startsAt`, `expiresAt`, `paymentProvider`, `paymentId`.

### 10. `OtpChallenge`
- **Purpose**: Ephemeral 5-digit OTP verification challenges.
- **Key Fields**: `id`, `mobile`, `hashedOtp`, `attempts`, `maxAttempts`, `expiresAt`, `verifiedAt`.
- **Security Rule**: Demo OTP (`12345`) works strictly in `development` mode when `ENABLE_DEMO_OTP="true"`. Production rejects demo OTP.

### 11. `AuditLog`
- **Purpose**: Immutable activity logging for privileged actions and security auditing.
- **Key Fields**: `id`, `actorId`, `action`, `resourceType`, `resourceId`, `ipAddress`, `userAgent`, `metadata`, `createdAt`.

