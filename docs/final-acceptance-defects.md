# Final Acceptance Defects Register

## P0 Launch Blockers

None found in the bounded local acceptance pass.

## P1 Must Fix Before Launch

None remaining after the accessibility fixes in this branch.

Fixed P1:

- `ACC-001` Driver dashboard progress bar used `aria-label` on a generic `div`.
  - Fix: added `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- `ACC-002` Primary buttons failed WCAG AA color contrast in axe computed styles.
  - Fix: primary `Button` now sets computed text color to white for the primary variant.
- `ACC-003` Admin driver verification selects had no accessible names.
  - Fix: added explicit `aria-label` values for status filter and decision reason.

## P2 High-Priority Polish

- `E2E-ISO-001` Existing e2e suites share mutable mock users and seeded entities. Running all phase suites together, especially in parallel, causes state pollution: safety blocking hides public trips, trip operations alter booking statuses, and driver verification approval changes the default driver profile.
  - Evidence: serial regression passed 39/50 and failed state-sensitive tests after earlier suites mutated shared fixtures.
  - Suggested fix: isolate acceptance fixtures per scenario or reseed between destructive groups in a dedicated acceptance runner.
- `MINIO-001` MinIO health is green, but unauthenticated `mc ls local` returned `Access Denied`.
  - Suggested fix: document expected credentialed bucket verification command and include it in local acceptance.

## P3 Post-Launch Debt

- `PW-001` Playwright wrapper keeps an open handle after assertions pass and exits through external timeout `124`; ports are released.
- `DEV-001` PowerShell blocks `npx.ps1`; use `npx.cmd` or adjust local execution policy.
- `DOCKER-001` Docker daemon access requires elevated execution on this Windows host.
