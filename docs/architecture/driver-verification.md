# Driver Verification Architecture

Phase 2 adds a versioned driver verification workflow on top of the existing identity foundation.

The aggregate starts at `DriverProfile`. A profile owns many `DriverVerificationApplication` records and points to one current application. Applications contain personal data, driver license data, consent versions, and verification-only vehicle data. Vehicle fields are snapshots for moderation and are not the future Vehicle module.

State transitions are action-based:

`DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED | REJECTED | CHANGES_REQUESTED`

`CHANGES_REQUESTED -> SUBMITTED`

`APPROVED -> SUSPENDED`

`SUSPENDED -> UNDER_REVIEW -> APPROVED`

Every admin decision writes an append-only `DriverVerificationReview`, a `DriverVerificationEvent`, an `AuditEvent`, and an outbox notification placeholder. Documents are metadata rows linked to private object storage through `FileObject`; binaries are never stored in PostgreSQL.

Roles:

- `DRIVER`: own application and own documents only.
- `ADMIN`: moderation queue, document access, review decisions.
- `CLIENT`: no driver verification access.
- `SUPPORT`: no driver document access.

Production must rely on private buckets, short-lived signed URLs, database/infrastructure encryption, log redaction, and backend authorization for every document access.
