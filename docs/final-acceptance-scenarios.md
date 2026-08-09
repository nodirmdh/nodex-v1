# Final Acceptance Scenario Matrix

Final isolated replay status: `blocked`.

Acceptance isolation added:

- `pnpm acceptance:reset` restores mutable shared fixtures and removes acceptance-created records behind `ACCEPTANCE_MODE=true`.
- `pnpm acceptance:seed` and `pnpm acceptance:scenario` use the same guarded deterministic reset path.
- New targeted suites:
  - `tests/e2e/final-acceptance-scenarios.spec.ts`
  - `tests/e2e/final-acceptance-negative.spec.ts`
  - `tests/e2e/final-acceptance-mobile.spec.ts`
  - `tests/e2e/final-acceptance-storage.spec.ts`

Execution blocker: Docker Desktop Linux engine is unavailable, so PostgreSQL and MinIO cannot be started and the suites were not executed in this pass.

## Scenario A: Cash Passenger Ride

Status: not executed in final isolated replay.

Prepared coverage: creates a fresh cash booking from public search, confirms it, creates cash payment intent, and verifies client booking access.

## Scenario B: Online Mock Ride

Status: not executed in final isolated replay.

Prepared coverage: creates a fresh online booking, creates mock payment intent, signs and posts mock success webhook, and verifies succeeded payment status.

## Scenario C: Online Payment Failure

Status: not executed in final isolated replay.

Prepared coverage: posts signed failed mock webhook and rejects an expired signed webhook.

## Scenario D: Refund

Status: not executed in final isolated replay.

Prepared coverage: creates a fresh successful online payment and requests a refund with a deterministic idempotency key.

## Scenario E: Parcel

Status: not executed in final isolated replay.

Prepared coverage: creates a fresh parcel on a public available trip and checks UZS minor-unit pricing.

## Scenario F: Chat And Support

Status: not executed in final isolated replay.

Prepared coverage: creates booking conversation, posts deterministic chat message, and opens a support ticket.

## Scenario G: Safety

Status: not executed in final isolated replay.

Prepared coverage: creates a deterministic trusted contact and safety report after reset, eliminating the reused-state `409` source.

## Scenario H: Admin Finance

Status: not executed in final isolated replay.

Prepared coverage: verifies admin finance payments and ledger APIs and client/driver/admin finance UI surfaces.

## Negative Access

Status: not executed in final isolated replay.

Prepared coverage: client, driver, public/token, code, finance, and restriction denial checks are captured in `tests/e2e/final-acceptance-negative.spec.ts`.

## Mobile Matrix

Status: not executed in final isolated replay.

Prepared coverage:

- Client 360x800, 390x844, 430x932.
- Driver 360x800, 390x844, 430x932.
- Admin 1280x800, 1440x900, 1024x768.

Screenshots are configured to save under `artifacts/final-acceptance/mobile`.

## MinIO And Storage

Status: not executed in final isolated replay.

Prepared coverage: MinIO live/ready checks, signed vehicle upload URL, parcel photo storage key write, public DTO raw storage key absence, and raw object access denial.
