# Trip Operations

The Phase 7 state machine covers:

`PUBLISHED | BOOKING_OPEN | FULL -> BOARDING -> IN_PROGRESS -> COMPLETED`

Operational cancellation is allowed before trip start:

`PUBLISHED | BOOKING_OPEN | FULL | BOARDING -> CANCELLED`

Blocked trips cannot move into boarding or in-progress until unblocked. Same-state retries are
treated as idempotent success.

Driver start requires a driver-owned trip, approved driver, approved vehicle, `BOARDING` status, and
resolved passengers. The MVP rule is explicit: before start, every active passenger must be boarded
or marked no-show unless the command includes an admin-style unresolved-passenger override.

Completion keeps completed-trip seats out of public availability. Cancelled trips may release seats,
but cancelled trips are not searchable.
