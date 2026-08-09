# Final Acceptance Defects Register

## P0 Launch Blockers

None found in the bounded local acceptance pass.

## P1 Must Fix Before Launch

- `ACC-INFRA-001` Final isolated local acceptance cannot run because Docker Desktop's Linux engine pipe is unavailable on this host.
  - Evidence: `docker compose up -d postgres redis minio mailpit` failed with `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`.
  - Impact: PostgreSQL `localhost:15432` and MinIO `localhost:9000` are unavailable, so required isolated scenarios, negative matrix, mobile storage-backed flows, seed/reset replay, migration deploy, and MinIO checks cannot be completed locally.
  - Required action: start Docker Desktop/Linux engine or provide an equivalent reachable local PostgreSQL, Redis, and MinIO stack, then rerun the final acceptance commands.

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
  - Fix in progress: added guarded `acceptance:reset`, `acceptance:seed`, and `acceptance:scenario` scripts plus isolated final acceptance specs. Execution is blocked by `ACC-INFRA-001`.
- `MINIO-001` MinIO health is green, but unauthenticated `mc ls local` returned `Access Denied`.
  - Suggested fix: document expected credentialed bucket verification command and include it in local acceptance.

## P3 Post-Launch Debt

- `PW-001` Playwright wrapper keeps an open handle after assertions pass and exits through external timeout `124`; ports are released.
- `DEV-001` PowerShell blocks `npx.ps1`; use `npx.cmd` or adjust local execution policy.
- `DOCKER-001` Docker daemon access requires elevated execution on this Windows host; on the final follow-up pass Docker Desktop was not running.
