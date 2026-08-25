# Booking and seat holds

Phase 6 adds booking supply without online payments.

## Public inventory

- `GET /api/v1/trips/public/{tripId}/seats` returns privacy-safe seat inventory for a future public trip.
- Seat prices are integer UZS minor units.
- Expired holds are released opportunistically before inventory is returned.

## Client flow

- `POST /api/v1/bookings/holds` creates an idempotent temporary hold.
- `GET /api/v1/bookings/holds/{holdId}` returns an owned hold.
- `POST /api/v1/bookings/holds/{holdId}/confirm` records passenger details, baggage, payment method, and confirms seats.
- `DELETE /api/v1/bookings/holds/{holdId}` releases an active hold.
- `GET /api/v1/bookings/mine` and `GET /api/v1/bookings/{bookingId}` return only the authenticated client's bookings.
- `POST /api/v1/bookings/{bookingId}/cancel` cancels an owned booking and releases inventory.

## Driver and admin flow

- Drivers can list and review bookings only for their own trips.
- Admins can list bookings, inspect detail/history, and cancel bookings.
- Sensitive actions write booking timeline events, audit events, and outbox events.

## Concurrency

Seat hold creation uses a Redis trip-level lock plus a Postgres transaction. Confirming a hold changes seats from `HELD` to `BOOKED`; availability is decremented only on confirmation. Releasing or expiring a hold returns `HELD` seats to `AVAILABLE`.
