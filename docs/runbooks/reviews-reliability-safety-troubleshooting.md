# Phase 10 Trust and Safety Troubleshooting

## Review creation returns ineligible

Confirm the linked booking is completed or the linked parcel is delivered. The reviewer must be a participant and the reviewee must be the matching counterpart.

## Duplicate review behavior is surprising

Review creation is idempotent by request key and updates the existing matching reviewer/reviewee/object review when found.

## Safety report is not visible to a user

Client and driver APIs return only reports created by the current user. Admin and support users must use `/admin/safety/reports`.

## Trip share does not open

Confirm the token is valid, the share is not revoked, and `expiresAt` is still in the future. Public share DTOs intentionally expose only privacy-safe trip context.

## Restriction did not expire

The trust safety worker processes active restrictions whose `endsAt` is in the past. Confirm Redis is running and the `nodex.trust-safety.maintenance` repeat job exists.
