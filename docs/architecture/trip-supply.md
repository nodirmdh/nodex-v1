# Phase 4 Trip Supply Architecture

Phase 4 adds route directories and driver trip supply without bookings, payments, holds, chat, reviews, support flows, maps, or client search.

Core model:

- `Region`, `City`, `PickupPoint`, `Route`, `RouteStop`
- expanded `Trip`
- `TripStop`, `TripSeatSnapshot`, `TripModerationEvent`, `TripTimelineEvent`

Driver trips depend on the Phase 2/3 approval chain:

- driver profile must be `APPROVED`
- vehicle must be `APPROVED`
- vehicle must belong to the driver
- suspended or archived vehicles cannot be used

Trip publication is handled by a dedicated validation function that returns concrete error codes. Direct critical-field edits are only allowed while a trip is `DRAFT` or `UNPUBLISHED`; published trips must be unpublished before critical changes.

All money values are stored as integer minor units in `UZS`. All persisted timestamps are UTC, with `Asia/Tashkent` as the default display timezone.
