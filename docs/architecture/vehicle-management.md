# Vehicle Management Architecture

Phase 3 turns the foundation `Vehicle` placeholder into a moderated aggregate owned by an approved `DriverProfile`.

The aggregate root is `Vehicle`. It stores vehicle data, normalized plate number, primary selection, lifecycle status, optimistic `version`, and moderation timestamps. Documents and photos are separate metadata tables linked to private `FileObject` rows. Decisions are append-only `VehicleModerationReview` rows; domain history is stored in `VehicleModerationEvent`; sensitive transitions also write `AuditEvent` and notification placeholders to `OutboxEvent`.

Approved vehicles are the only vehicles eligible for later trip creation. Phase 3 does not implement trips or seat layout editing. Active-trip archive protection is represented by a safe `Trip` lookup placeholder so the future Trips module can attach real status semantics without changing the vehicle API contract.

Critical changes to approved vehicles are not edited in place. The current implementation requires edits through the draft/resubmit moderation statuses (`CHANGES_REQUESTED` or `REJECTED`) and keeps prior moderation reviews and events.
