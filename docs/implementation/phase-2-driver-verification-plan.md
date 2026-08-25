# Phase 2 Driver Verification Plan

## Reused Foundation And Phase 1 Components

- `User`, `Role`, `Permission`, `UserRole`, `TelegramIdentity`, `AuthSession`, and mock Telegram auth remain the identity backbone.
- Existing `DriverProfile` is the driver aggregate root; no second driver user table is introduced.
- `AuditEvent`, `TimelineEvent`, and `OutboxEvent` are reused for review history, operational audit, and notification placeholders.
- `FileObject` and `FileAttachment` remain the storage metadata abstraction. Verification documents store object keys and metadata only; binaries stay in MinIO-compatible object storage.
- The API keeps the existing `/api/v1` prefix, auth middleware style, error envelope, OpenAPI bootstrap, Orval generation, Playwright runner, and mock auth flow.

## New Prisma Models

- `DriverVerificationApplication`: versioned application linked to `DriverProfile`, containing personal data, license data, verification-only vehicle data, consent versions, lifecycle timestamps, duplicate flag, and optimistic `version`.
- `DriverVerificationDocument`: document metadata linked to an application and optional `FileObject`.
- `DriverVerificationReview`: append-only admin decisions and reason history.
- `DriverVerificationEvent`: append-only domain events for driver/admin actions.

Existing `DriverProfile` gains current application and suspension fields only where needed.

## State Machine

Allowed application transitions:

- `DRAFT -> SUBMITTED`
- `SUBMITTED -> UNDER_REVIEW`
- `SUBMITTED -> WITHDRAWN`
- `UNDER_REVIEW -> APPROVED`
- `UNDER_REVIEW -> REJECTED`
- `UNDER_REVIEW -> CHANGES_REQUESTED`
- `CHANGES_REQUESTED -> SUBMITTED`
- `APPROVED -> SUSPENDED`
- `SUSPENDED -> UNDER_REVIEW`
- `SUSPENDED -> APPROVED`

All transitions are exposed as domain actions, never as a generic status patch.

## Upload Flow

The Phase 2 API exposes a presign/complete flow:

1. Driver requests a short-lived signed upload placeholder for an editable application document type.
2. Client uploads directly to private object storage in production.
3. Driver completes upload by sending the object key, MIME type, size, checksum, and original file name.
4. API validates ownership, status, MIME, size, checksum shape, document type, and stores metadata.

Local foundation implementation returns mock signed URLs while preserving private-key semantics and backend-only download authorization.

## Admin Moderation Flow

Admin can list, search, filter, open details, start review, approve, reject, request changes, suspend, restore, view history, and request document downloads. Every decision creates `DriverVerificationReview`, `DriverVerificationEvent`, `AuditEvent`, and notification outbox placeholders when relevant.

## Security Model

- Driver endpoints require `DRIVER` and only access own application.
- Admin moderation endpoints require `ADMIN`.
- `CLIENT` and `SUPPORT` have no document access.
- Sensitive values are redacted in list responses and logs.
- Signed URLs and storage keys are not exposed outside authorized document download responses.
- Production must use private object storage, short TTL signed URLs, and infrastructure/database encryption; no custom crypto is introduced.

## API Contracts

Driver:

- `GET /api/v1/driver/verification`
- `POST /api/v1/driver/verification`
- `PATCH /api/v1/driver/verification`
- `POST /api/v1/driver/verification/submit`
- `POST /api/v1/driver/verification/withdraw`
- `GET /api/v1/driver/verification/history`
- `GET /api/v1/driver/verification/completion`
- document presign, complete, delete, replace, and download endpoints

Admin:

- queue/detail/history endpoints
- start review, approve, reject, request changes, suspend, restore endpoints
- admin document access endpoint

## UI Flow

Driver Mini App shows a compact mobile verification workspace: overview, seven-step form, upload previews, autosave indicator, validation summary, status panels, and history. Admin Web shows a moderation queue, filters, masked sensitive values, detail/review panel, reason controls, document viewer placeholders, and history timeline.

## Test Plan

- Unit tests cover state transitions, completion, validation, reasons, masking, and upload rules.
- Integration tests cover draft lifecycle, submit, admin actions, resubmission, document metadata, ownership, and conflicts.
- E2E tests cover driver API/UI and admin API/UI happy paths plus important forbidden access checks.
- Accessibility checks include stepper, upload controls, status screens, admin queue, decision controls, and history timeline.

## Migration Plan

Add one Phase 2 migration after Phase 1:

- new enums for application/document/review status;
- new tables and relations;
- indexes on status, submitted date, reviewer, document type, duplicate flag;
- profile current application and suspension columns;
- no destructive changes to Phase 1 auth data.

## Expected Changed Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/*_phase_2_driver_verification/migration.sql`
- `packages/database/prisma/seed.ts`
- `packages/config/src/index.ts`
- `packages/contracts/src/index.ts`
- `packages/validation/src/index.ts`
- `packages/auth/src/index.ts`
- `apps/api/src/main.ts`
- `apps/driver-mini-app/src/app/**`
- `apps/admin-web/src/app/**`
- `tests/e2e/**`
- documentation under `docs/api`, `docs/architecture`, `docs/security`, `docs/runbooks`, and `docs/implementation`
- `README.md` and `.env.example`
