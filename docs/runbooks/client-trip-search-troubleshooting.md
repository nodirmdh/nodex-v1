# Client Trip Search Troubleshooting

## Search Returns No Trips

1. Confirm seed data was applied.
2. Check that the searched date matches a future published fixture.
3. Confirm the driver profile is approved.
4. Confirm the vehicle is approved, active, not archived, and not suspended.
5. Check passenger count and filters before changing pagination.

## Public Detail Is 404

The public detail endpoint only returns searchable trips. Draft, unpublished, cancelled, blocked, past, full, unapproved-driver, and unapproved-vehicle trips are intentionally hidden.

## Playwright Smoke Hangs After Passing

This is the known dev-tooling open-handle issue inherited from Phase 2-4. If assertions pass but the CLI reaches the external timeout, record the functional pass and confirm ports 3100-3104 are free.
