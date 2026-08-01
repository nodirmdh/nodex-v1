# Client Trip Search API

Phase 5 exposes privacy-safe public trip discovery without booking or seat holds.

## Endpoints

- `GET /api/v1/trips/search`
  - Required query: `originCityId`, `destinationCityId`, `date`.
  - Optional query: `passengers`, `page`, `pageSize`, `sort`, `departureWindow`, `minPriceMinor`, `maxPriceMinor`, `parcelSupported`, `wholeCarAvailable`, `luggageRequired`, `vehicleBodyType`, `sessionId`.
  - Returns only future `PUBLISHED` or `BOOKING_OPEN` trips with approved driver and approved active vehicle.
  - Filtering is applied before pagination. Sorting is stable with departure time and trip id tie-breakers.

- `GET /api/v1/trips/public/{tripId}`
  - Returns a public trip detail DTO for a searchable trip.
  - Does not expose driver phone, Telegram identity, private files, vehicle documents, audit, moderation notes, or hidden cancellation/blocking metadata.

- `POST /api/v1/search-events`
  - Records privacy-safe search intent events such as result open, share click, or booking CTA click.
  - Does not create bookings, seat holds, payments, or waitlist entries.

## Money And Time

All prices remain integer minor units in UZS. API timestamps are UTC; date searches use the route city's `Asia/Tashkent` day boundary for MVP launch cities.
