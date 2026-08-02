# Rollback Plan

1. Stop new payment creation by disabling the payment feature flag.
2. Keep read-only payment status and support/admin visibility available.
3. Drain or pause `nodex.finance.maintenance`.
4. Reconcile any in-flight successful provider payments before schema rollback.
5. Restore from verified backup only if data corruption is confirmed.
6. Record all manual corrections in financial audit.
