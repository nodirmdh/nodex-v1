# Phase 9 Communication API

## Conversations

- `POST /api/v1/conversations`
- `GET /api/v1/conversations`
- `GET /api/v1/conversations/{conversationId}`
- `GET /api/v1/conversations/{conversationId}/messages`
- `POST /api/v1/conversations/{conversationId}/messages`
- `POST /api/v1/conversations/{conversationId}/read`
- `PATCH /api/v1/messages/{messageId}`
- `DELETE /api/v1/messages/{messageId}`
- `POST /api/v1/messages/{messageId}/report`

Conversation creation is idempotent per booking or parcel. Messages are idempotent per `conversationId + clientMessageId`.

## Notifications

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/{id}/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/notifications/{id}/archive`
- `POST /api/v1/admin/notifications`

Notification deliveries are tracked per channel. In-app delivery is completed immediately; Telegram delivery is processed by the worker in dev/mock mode.

## Support

- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets`
- `GET /api/v1/support/tickets/{ticketId}`
- `POST /api/v1/support/tickets/{ticketId}/messages`
- `GET /api/v1/admin/support/tickets`
- `GET /api/v1/admin/support/tickets/{ticketId}`
- `POST /api/v1/admin/support/tickets/{ticketId}/reply`
- `POST /api/v1/admin/support/tickets/{ticketId}/internal-notes`
- `POST /api/v1/admin/support/tickets/{ticketId}/assign`
- `POST /api/v1/admin/support/tickets/{ticketId}/status`
- `GET /api/v1/admin/support/tickets/{ticketId}/history`

Ticket state transitions use the shared validation service and return concrete transition errors for invalid moves.
