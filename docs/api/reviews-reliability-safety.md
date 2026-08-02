# Phase 10 Trust and Safety API

Phase 10 endpoints use the existing `/api/v1` prefix and bearer auth where required.

## Reviews

- `GET /reviews/eligibility`
- `POST /reviews`
- `GET /reviews/mine`
- `GET /reviews/received`
- `GET /reviews/{reviewId}`
- `PATCH /reviews/{reviewId}`
- `DELETE /reviews/{reviewId}`
- `POST /reviews/{reviewId}/report`
- `GET /users/{userId}/rating-summary`
- `GET /drivers/{driverId}/public-reliability`

Review creation is idempotent through `Idempotency-Key`. Eligibility requires a completed booking or delivered parcel, an eligible reviewer, the correct counterpart, and an open review window.

## Safety

- `POST /safety/reports`
- `GET /safety/reports/mine`
- `GET /safety/reports/{reportId}`
- `POST /users/{userId}/block`
- `DELETE /users/{userId}/block`
- `GET /blocks/mine`
- `POST /trusted-contacts`
- `GET /trusted-contacts`
- `PATCH /trusted-contacts/{contactId}`
- `DELETE /trusted-contacts/{contactId}`
- `POST /trips/{tripId}/shares`
- `GET /trips/{tripId}/shares`
- `DELETE /trip-shares/{shareId}`
- `GET /public/trip-shares/{token}`
- `POST /emergency/actions`

SOS and emergency actions are audit records and guidance surfaces only. They do not call external emergency services automatically.

## Admin

- `GET /admin/safety/reports`
- `POST /admin/safety/reports/{reportId}/assign`
- `POST /admin/safety/reports/{reportId}/status`
- `POST /admin/safety/reports/{reportId}/internal-notes`
- `POST /admin/users/{userId}/restrictions`
- `POST /admin/restrictions/{restrictionId}/revoke`
- `GET /admin/moderation/queue`

Admin and support endpoints expose moderation state, assignments, internal notes, and restriction actions only to privileged roles.
