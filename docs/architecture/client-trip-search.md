# Client Trip Search Architecture

Phase 5 reuses the Phase 4 trip supply model and directory data. Region, city, pickup point, and route lookup stays in the existing directory endpoints; search only composes those entities with published trip supply.

## Domain Rules

- Search accepts only future trips that are public and available.
- Driver verification must be `APPROVED`.
- Vehicle status must be `APPROVED`, not archived, and not suspended.
- Filtering is completed before pagination.
- Sorting is stable, with deterministic tie-breakers.
- Public DTOs omit private driver, vehicle, file, audit, moderation, and operational metadata.
- Booking CTAs record intent only; they do not create booking, seat hold, or payment state.

## Local Client State

The client mini app keeps recent searches in local storage for MVP. Search filters are mirrored to URL query parameters so a route/date/passenger result view can be shared or restored.

## Analytics

`SearchEvent` captures privacy-safe search and intent events. It stores route/date/passenger/filter metadata and optional trip/result rank context without storing private driver or passenger data.
