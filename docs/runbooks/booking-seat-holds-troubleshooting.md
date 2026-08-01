# Booking seat holds troubleshooting

## Redis lock unavailable

Hold creation requires Redis at `REDIS_URL`. If clients receive `SEAT_LOCK_BUSY` repeatedly, check Redis health and the `booking:trip:*` keys. Lock TTL defaults to 15 seconds.

## Holds do not expire

The API releases expired holds opportunistically when seat inventory is read. The worker also schedules `nodex.booking.hold-expiration` every 60 seconds. Check worker logs for `processed booking hold expiration job`.

## Seat counts look wrong

Availability is decremented on confirmation, not hold creation. Active holds show seats as `HELD`, but `Trip.availableSeatCount` changes only after confirmation or cancellation of booked seats.

## Duplicate bookings

Client hold creation accepts `Idempotency-Key`. Reusing a key with a different request body returns `IDEMPOTENCY_KEY_REUSED`; reusing it with the same body returns the first hold response.
