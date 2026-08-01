# Phase 9 Communication Troubleshooting

## Notification Delivery Is Pending

1. Confirm Redis is running.
2. Start the worker.
3. Check `NotificationDelivery` records with `PENDING` or `RETRYING`.
4. Check `OutboxEvent` entries for `notification.delivery.requested` and `notification.delivery.completed`.

In local development, Telegram delivery uses a dev provider id and marks records delivered without requiring a real bot call.

## User Cannot Open Chat

Check that the conversation is linked to:

- a confirmed, boarding, or in-progress booking;
- a completed booking still inside retention;
- an accepted, handed-over, in-transit, or ready-for-pickup parcel;
- a delivered parcel still inside retention.

The requester must be a participant or the owner of the linked booking/parcel.

## Support Ticket Missing Internal Notes

This is expected for client and driver APIs. Internal notes are only returned through admin/support endpoints.
