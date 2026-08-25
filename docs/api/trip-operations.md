# Trip Operations API

Phase 7 adds the operational lifecycle after bookings are confirmed.

Client endpoints:

- `GET /api/v1/bookings/:bookingId/boarding-code`
- `POST /api/v1/bookings/:bookingId/boarding-code/regenerate`
- `GET /api/v1/bookings/:bookingId/operation-status`

Driver endpoints:

- `POST /api/v1/driver/trips/:tripId/start-boarding`
- `GET /api/v1/driver/trips/:tripId/passengers`
- `GET /api/v1/driver/trips/:tripId/boarding`
- `POST /api/v1/driver/bookings/:bookingId/board`
- `POST /api/v1/driver/bookings/:bookingId/no-show`
- `POST /api/v1/driver/trips/:tripId/start`
- `POST /api/v1/driver/trips/:tripId/complete`
- `POST /api/v1/driver/trips/:tripId/cancel`
- `GET /api/v1/driver/trips/:tripId/operations`

Admin endpoints:

- `GET /api/v1/admin/trips/:tripId/operations`
- `POST /api/v1/admin/trips/:tripId/cancel`
- `POST /api/v1/admin/trips/:tripId/no-show-driver`

Boarding codes are single-use. The API returns plaintext codes only to the booking owner, stores
only hashes, tracks attempts, locks exhausted codes, and records timeline, audit, and outbox events
inside the same database transaction as the state change.
