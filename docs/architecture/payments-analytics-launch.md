# Payments, Analytics, and Launch Hardening

Phase 11 adds provider-agnostic payments, cash settlement, refunds, ledger accounting,
driver earnings, payout batches, reconciliation, analytics events, and launch operations.

## Scope

- Booking and parcel payments use integer minor units in UZS.
- `@nodex/payments` owns money helpers, pricing, provider adapters, refund checks, and ledger balance validation.
- API routes expose client payment intents, payment status, refund requests, driver earnings, cash confirmation, admin finance, reconciliation, and analytics metrics.
- Worker maintenance expires stale payment intents, processes queued refunds, releases eligible earnings, and aggregates daily metrics.
- Admin UI surfaces finance and analytics review screens. Driver UI surfaces earnings and cash settlement status. Client UI surfaces payment and refund status.

## Boundaries

No booking creation, seat hold, seat selection, dynamic pricing, wallet balance, real acquirer integration, or parcel lifecycle expansion is introduced in this phase.

## Provider Model

Payment providers implement a small adapter interface. Local development uses `MOCK`; manual operations use `MANUAL`. Production blocks `MOCK` for new payment intents.

## Ledger

Every successful payment posts balanced debit and credit entries. Driver earnings are derived from net amount after platform fee. Refund processing posts a reversal-style transaction and updates refundable totals.
