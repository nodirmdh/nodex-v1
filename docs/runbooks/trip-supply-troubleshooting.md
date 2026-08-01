# Trip Supply Troubleshooting

Common checks:

- Verify Prisma Client exposes `region`, `city`, `pickupPoint`, `route`, `tripStop`, and `tripSeatSnapshot`.
- Run Prisma validate before migration apply.
- Seed directories before creating trip fixtures.
- If publish fails, inspect `validation.errors` from `POST /api/v1/trips/:tripId/publish`.
- If a driver cannot create a trip, confirm driver verification and vehicle status are both `APPROVED`.
- If a published trip needs critical edits, unpublish it first.

Do not diagnose the Playwright open-handle issue as part of product Phase 4 unless specifically assigned.
