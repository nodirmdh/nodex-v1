# Booking seat holds architecture

Phase 6 introduces booking records, seat inventory, and temporary holds while keeping payment outside the system.

## Boundaries

- Booking is allowed only for future public trips with approved drivers and approved vehicles.
- Seat holds are temporary and idempotent per client request.
- Confirmed bookings keep immutable pricing and trip snapshots.
- Online payment, refunds, waitlists, boarding, chat, and reviews remain outside this phase.

## Seat states

- `AVAILABLE`: can be held.
- `HELD`: reserved by an active hold until expiry or release.
- `BOOKED`: confirmed booking.
- `BLOCKED` and `UNAVAILABLE`: operational states reserved for admin and vehicle constraints.

## Critical transitions

Hold creation is protected by a Redis lock and a Postgres transaction. Confirmation, release, cancellation, and worker expiry are idempotent: repeating the same transition returns or preserves the already-final state instead of double-counting inventory.

## Observability

Booking transitions write:

- `BookingTimelineEvent` for user-facing history.
- `AuditEvent` for sensitive admin/driver/client operations.
- `OutboxEvent` for async notifications and later integrations.
