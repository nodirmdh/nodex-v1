# Outbox Foundation

Critical domain mutations write outbox rows in the same database transaction.

Foundation model:

- `OutboxEvent.type`
- `OutboxEvent.payload`
- `OutboxEvent.status`
- `OutboxEvent.availableAt`
- `OutboxEvent.processedAt`

Worker strategy:

- process pending events with bounded concurrency;
- retry transient failures;
- move poison events to a dead-letter state later;
- keep notification delivery idempotent by dedupe key.
