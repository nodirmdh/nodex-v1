# Payments Launch Hardening

- Store all prices as integer minor units in UZS.
- Keep provider secrets outside source control.
- Disable `MOCK` provider in production payment creation.
- Do not expose driver private profile data, vehicle documents, file objects, audit payloads, or moderation fields in public payment DTOs.
- Require idempotency keys for payment, refund, payout, and webhook side effects.
- Verify provider webhooks against the raw request body; reject stale timestamps and invalid signatures.
- Enforce finance uniqueness at the database layer for payment fees, driver earnings, cash declarations, cash settlements, reconciliation runs, and provider reconciliation references.
- Record sensitive finance actions in `FinancialAuditEvent`.
- Reconcile provider data before marking payout batches complete.
- Keep analytics payloads privacy-safe; reject contact, chat, support message, and free-text private message fields.
- Keep backup and restore credentials separate from application runtime credentials.
