# Parcel Delivery

Phase 8 adds parcel delivery on top of existing intercity trips without coupling parcels to passenger bookings.

## Domain

`ParcelOrder` is the aggregate root. It may reference a `Trip`, `DriverProfile`, `Vehicle`, pickup point, destination pickup point, and sender `User`.

Prices are stored as integer minor units in UZS. Timestamps are UTC.

Sensitive lifecycle changes write:

- `ParcelEvent`
- `ParcelTimelineEvent`
- `AuditEvent`
- `OutboxEvent`

## Lifecycle

Supported statuses:

`DRAFT`, `CREATED`, `PENDING_DRIVER_ACCEPTANCE`, `ACCEPTED`, `HANDED_TO_DRIVER`, `IN_TRANSIT`, `READY_FOR_PICKUP`, `DELIVERED`, `CANCELLED_BY_SENDER`, `CANCELLED_BY_DRIVER`, `CANCELLED_BY_ADMIN`, `REJECTED`, `LOST`, `DAMAGED`, `DISPUTED`, `EXPIRED`.

Critical fields are editable only before acceptance. Transition helpers are idempotent when the parcel is already in the target status.

Trip integration:

- starting a trip moves `HANDED_TO_DRIVER` parcels to `IN_TRANSIT`;
- completing a trip does not auto-deliver parcels;
- cancelling a trip cancels active parcels and records parcel cancellations.

## Codes

Handover and pickup codes are stored hash-only. API responses expose code metadata and one-time plaintext only when regenerating.

Codes have TTL, attempts, max attempts, lock, verification, and replacement states.

## Privacy

Public and list DTOs do not expose code hashes, storage keys, private driver files, audit internals, or moderation-only data.
