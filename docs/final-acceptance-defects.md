# Final Acceptance Defects Register

## P0 Launch Blockers

None found in the bounded local acceptance pass.

## P1 Must Fix Before Launch

None open.

Fixed P1:

- `SEC-AUDIT-001` Production dependency audit reports high-severity advisories.
  - Fix: updated overrides and lockfile for production-impacting `fast-uri`, `brace-expansion`, and `nanoid` paths.
  - Verification: `pnpm audit:production` reports no known vulnerabilities.
- `ACC-001` Driver dashboard progress bar used `aria-label` on a generic `div`.
  - Fix: added `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- `ACC-002` Primary buttons failed WCAG AA color contrast in axe computed styles.
  - Fix: primary `Button` now sets computed text color to white for the primary variant.
- `ACC-003` Admin driver verification selects had no accessible names.
  - Fix: added explicit `aria-label` values for status filter and decision reason.
- `ACC-INFRA-001` Local acceptance could not run while Windows reserved host Redis port `6379`.
  - Fix: local/dev config now maps Redis host `6387` to container `6379`, maps MinIO host `9100/9101` to container `9000/9001`, and keeps Docker-internal Redis access on `redis:6379`.

## P2 High-Priority Polish

- `E2E-ISO-001` Existing e2e suites share mutable mock users and seeded entities. Running all phase suites together, especially in parallel, can cause state pollution.
  - Fix in progress: guarded `acceptance:reset`, `acceptance:seed`, and isolated final acceptance specs now pass in the targeted acceptance replay.
- `MINIO-001` MinIO health is green, but unauthenticated `mc ls local` returned `Access Denied`.
  - Suggested fix: document expected credentialed bucket verification command and include it in local acceptance.

Fixed P2:

- `ACC-SMOKE-001` Final acceptance booking smoke searched for an acceptance trip on a fixed 2026-08-13 date.
  - Fix: acceptance seed and smoke helper now derive the deterministic trip/search date from a future UTC day.
  - Verification: split booking, payment, chat/support, and MinIO smoke assertions passed.

## P3 Post-Launch Debt

- `PW-001` Playwright wrapper keeps an open handle after assertions pass and exits through external timeout `124`; ports are released.
- `SEC-DEV-001` Full dependency audit reports dev-only Storybook `image-size@2.0.2` advisories.
  - Classification: not production-impacting; `pnpm audit:production` is clean.
  - Follow-up: upgrade once a patched `image-size` release is available through the Storybook dependency chain.
- `DEV-001` PowerShell blocks `npx.ps1`; use `npx.cmd` or adjust local execution policy.
- `DOCKER-001` Docker daemon access requires elevated execution on this Windows host.
