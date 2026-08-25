# Payments and Analytics API

## Client

- `POST /api/v1/payments/intents` creates an idempotent payment record for a booking or parcel order.
- `GET /api/v1/payments/{paymentId}` returns privacy-safe payment status.
- `POST /api/v1/payments/{paymentId}/refunds` requests a refund within the refundable amount.
- `POST /api/v1/analytics/events` records privacy-safe product events.

## Driver

- `GET /api/v1/driver/earnings` lists pending, available, paid earnings and open cash settlements.
- `POST /api/v1/driver/payments/cash-confirmations` confirms or disputes cash received for a payment.

## Admin

- `GET /api/v1/admin/finance/payments` lists payment operations.
- `GET /api/v1/admin/finance/ledger` lists financial ledger entries.
- `POST /api/v1/admin/finance/payouts` creates a payout batch from available earnings.
- `POST /api/v1/admin/finance/payouts/{payoutId}/status` updates payout status.
- `POST /api/v1/admin/finance/reconciliation-runs` creates a reconciliation run.
- `GET /api/v1/admin/analytics/metrics` returns daily metrics, funnels, and exports.

All sensitive admin actions require authenticated admin or support roles and write financial audit events.
