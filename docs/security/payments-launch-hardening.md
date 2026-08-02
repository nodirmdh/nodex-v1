# Payments Launch Hardening

- Store all prices as integer minor units in UZS.
- Keep provider secrets outside source control.
- Disable `MOCK` provider in production payment creation.
- Do not expose driver private profile data, vehicle documents, file objects, audit payloads, or moderation fields in public payment DTOs.
- Require idempotency keys for payment, refund, payout, and webhook side effects.
- Record sensitive finance actions in `FinancialAuditEvent`.
- Reconcile provider data before marking payout batches complete.
- Keep backup and restore credentials separate from application runtime credentials.
