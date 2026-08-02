# Payments and Launch Troubleshooting

## Webhook Failure

1. Check `PaymentWebhookEvent.signatureValid`.
2. Confirm `MOCK_PAYMENT_WEBHOOK_SECRET` or provider secret configuration.
3. Reconcile the provider reference against `PaymentIntent.providerReference`.
4. Reprocess only idempotent events. Do not create duplicate payments.

## Queue Backlog

1. Inspect `nodex.finance.maintenance`.
2. Confirm Redis connectivity.
3. Check refund records in `REQUESTED` or payment intents in stale processing states.
4. Restart worker only after confirming no duplicate job processor is active.

## Payout Failure

1. Review `DriverPayout.status` and `failureReason`.
2. Verify included `DriverEarning` rows are still `ON_HOLD`.
3. Do not mark earnings `PAID` unless ledger payout transaction exists.

## Reconciliation Mismatch

1. Compare provider amount and expected amount in `ReconciliationItem`.
2. Check duplicate provider references.
3. Create an admin audit note before manual adjustment.
