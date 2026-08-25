# Parcel Delivery API

Phase 8 endpoints use the existing `/api/v1` prefix and bearer auth where required.

## Public

- `GET /parcel-categories`
- `GET /parcel-rules`
- `GET /trips/public/:tripId/parcel-availability`

## Client

- `POST /parcels`
- `GET /parcels/mine`
- `GET /parcels/:parcelId`
- `POST /parcels/:parcelId/submit`
- `POST /parcels/:parcelId/cancel`
- `POST /parcels/:parcelId/photos`
- `DELETE /parcels/:parcelId/photos/:photoId`
- `POST /parcels/:parcelId/handover-code/regenerate`
- `GET /parcels/:parcelId/pickup-code`

## Driver

- `GET /driver/trips/:tripId/parcels`
- `GET /driver/parcels/:parcelId`
- `POST /driver/parcels/:parcelId/accept`
- `POST /driver/parcels/:parcelId/reject`
- `POST /driver/parcels/:parcelId/handover`
- `POST /driver/parcels/:parcelId/ready-for-pickup`
- `POST /driver/parcels/:parcelId/deliver`
- `POST /driver/parcels/:parcelId/report-issue`

## Admin

- `GET /admin/parcels`
- `GET /admin/parcels/:parcelId`
- `GET /admin/parcels/:parcelId/history`
- `POST /admin/parcels/:parcelId/cancel`
- `POST /admin/parcels/:parcelId/mark-lost`
- `POST /admin/parcels/:parcelId/mark-damaged`
- `POST /admin/parcels/:parcelId/dispute`

Mutating client creation supports `Idempotency-Key`. Lifecycle actions are idempotent at the transition layer.
