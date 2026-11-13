# Architecture overview

Use a modular monolith for the first release. It is easier to build and operate than microservices while preserving clear domain boundaries.

## Backend domains
auth, users, guests, guest-import, events, invitations, rsvp, subscriptions, payments, templates, uploads, admin.

## Data ownership
Subscriber-owned records should include a tenant/owner reference. Enforce tenant scoping in service/repository functions and test cross-tenant access.

## Suggested API versioning
`/api/v1/auth`, `/api/v1/guests`, `/api/v1/events`, `/api/v1/invitations`, `/api/v1/rsvp`, `/api/v1/subscriptions`, `/api/v1/admin`.

## Background work
Use `jobs/` for later asynchronous tasks such as email notifications, cleanup and file processing. Add a queue only when a real asynchronous workload requires it.
