# Parcel Delivery Troubleshooting

## Prisma Client does not expose parcel delegates

Run the existing generation command:

```bash
pnpm db:generate
```

Then rerun typecheck.

## Codes do not verify

Check that the code row is `ACTIVE`, not expired, not locked, and not already verified. Codes are hash-only; plaintext is returned only at regeneration time.

## Parcels disappear from driver list

Driver routes are object-scoped by `driverProfileId`. Confirm the parcel references the same approved driver and vehicle as the trip.

## Trip start did not move parcel to transit

Only parcels in `HANDED_TO_DRIVER` move to `IN_TRANSIT` when the trip starts. Accepted parcels still require handover verification.

## Known local tooling issue

Targeted Playwright assertions can pass while the CLI keeps an open handle and is stopped by an external timeout. Treat the assertions and freed ports as the functional result; diagnose the handle separately.
