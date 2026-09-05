# ENVO Booking lifecycle

## States and transitions

- `HOLD`: the client selected concrete seat keys; the short-lived hold protects inventory.
- `PENDING_CONFIRMATION`: the client submitted the request. This is not a confirmed booking.
- `CONFIRMED`: only the approved owner-driver accepted the complete request.
- `REJECTED`: the owner-driver rejected the request and its seats were released.
- `CANCELLED_BY_*` / `EXPIRED`: terminal release states; confirmed seats return to inventory.
- Operational states (`BOARDING`, `IN_PROGRESS`, `COMPLETED`) and Start PIN remain unchanged.

## Seat and price rules

- One Booking Core handles `SEAT`, `MULTI_SEAT`, and `WHOLE_CAR`.
- Concrete `seatKey` values are persisted in `SeatHoldItem`, `BookingSeat`, and passengers.
- A Redis trip mutex plus transactional status/version checks prevents overlapping active holds and double decisions.
- Holds expire lazily during inventory reads, new requests, and driver decisions. Scheduler cleanup can be added later.
- Driver accept is atomic for the entire request: all seats become `BOOKED`, availability decreases, and a zero-seat trip becomes `FULL`.
- Reject, expiry, and allowed cancellation release the complete seat set. Cancelling a full confirmed booking reopens it as `BOOKING_OPEN`.
- Pricing is server-derived from the Trip base price and seat identity: front `+20%`, center `-20%`, other seats base price. Whole-car uses `Trip.wholeCarPriceMinor`.
- The booking stores per-seat prices and a total/pricing snapshot; clients cannot submit an arbitrary total or service fee.

## Actors and integrations

- Authenticated clients create and read their own requests; they cannot accept or reject.
- Only the approved driver who owns the Trip can list, read, accept, or reject its requests.
- `BOOKING_REQUESTED`, `BOOKING_CONFIRMED`, `BOOKING_REJECTED`, and `BOOKING_CANCELLED` reuse timeline, audit, and outbox foundations.
- Booking chat is eligible from `PENDING_CONFIRMATION`, so conversation context is available immediately after request submission.
- Pickup, baggage, preferences, comment, existing matching handoff, and Start PIN relations are preserved.
