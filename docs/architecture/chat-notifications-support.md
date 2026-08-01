# Phase 9 Chat, Notifications, and Support

Phase 9 adds communication surfaces around already-confirmed business objects. It does not create bookings, seat holds, payments, refunds, reviews, or external CRM workflows.

## Domain Scope

- Conversations are linked to a confirmed booking or an active parcel order.
- Messages support text, images, files, locations, system messages, receipts, soft delete, edit, and reports.
- In-app notifications are the source of truth for user-facing alerts.
- Telegram delivery is represented by notification delivery records and worker outbox events.
- Support tickets link to booking, trip, parcel, driver, and requester context.
- Internal support notes are admin/support-only and are never returned by public ticket endpoints.

## Privacy

Public conversation DTOs expose only safe user profile fields: id, display name, username, and avatar URL. Driver private files, vehicle private data, audit entries, moderation internals, and support internal notes stay out of client and driver APIs.

## Retention

Conversations and support tickets store `retentionUntil`. Phase 9 records the value and keeps retention cleanup as a worker-owned operational concern. A full retention deletion engine is intentionally out of scope.

## Audit And Timeline

Sensitive actions write audit records and communication timeline events:

- support ticket creation;
- admin support reply;
- ticket assignment;
- status transitions;
- chat message sends;
- worker notification delivery completion.
