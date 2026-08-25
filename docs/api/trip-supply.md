# Phase 4 Trip Supply API

Public directories:

- `GET /api/v1/regions`
- `GET /api/v1/cities`
- `GET /api/v1/cities/:cityId`
- `GET /api/v1/cities/:cityId/pickup-points`
- `GET /api/v1/routes`
- `GET /api/v1/routes/:routeId`

Driver:

- `GET /api/v1/trips/mine`
- `POST /api/v1/trips`
- `GET /api/v1/trips/:tripId`
- `PATCH /api/v1/trips/:tripId`
- `POST /api/v1/trips/:tripId/publish`
- `POST /api/v1/trips/:tripId/unpublish`
- `POST /api/v1/trips/:tripId/cancel`
- `GET /api/v1/trips/:tripId/history`

Admin:

- CRUD/list endpoints for regions, cities, pickup points, and routes
- `GET /api/v1/admin/trips`
- `GET /api/v1/admin/trips/:tripId`
- `POST /api/v1/admin/trips/:tripId/block`
- `POST /api/v1/admin/trips/:tripId/unblock`
- `POST /api/v1/admin/trips/:tripId/cancel`
- `GET /api/v1/admin/trips/:tripId/history`

Sensitive transitions require a reason where applicable and write audit/timeline records.
