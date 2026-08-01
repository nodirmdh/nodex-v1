# Trip Operations Troubleshooting

Use the operation history endpoints first:

- Driver: `GET /api/v1/driver/trips/:tripId/operations`
- Admin: `GET /api/v1/admin/trips/:tripId/operations`

Common cases:

- `TRIP_INVALID_TRANSITION`: current status does not allow the requested operation.
- `BOARDING_CODE_INVALID`: wrong code, attempt recorded.
- `BOARDING_CODE_LOCKED`: max attempts reached.
- `BOARDING_CODE_EXPIRED`: regenerate from the client booking detail.
- `TRIP_UNRESOLVED_PASSENGERS`: board or mark all passengers no-show before starting.

Do not diagnose the known Playwright open-handle issue during Phase 7 validation. If assertions pass
and ports are released, record functional pass separately from timeout `124`.
