# Final Acceptance Defects Register

## P0 Launch Blockers

None found in the bounded local acceptance pass.

## P1 Must Fix Before Launch

- `SEC-AUDIT-001` Production dependency audit reports high-severity advisories.
  - Evidence: `pnpm audit:production` reported high advisories for transitive `fast-uri`, `brace-expansion`, and `nanoid` paths.
  - Impact: production dependency audit gate is not green.
  - Required action: run a dedicated dependency remediation pass and rerun `pnpm audit:production`.

Fixed P1:

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

## P3 Post-Launch Debt

- `PW-001` Playwright wrapper keeps an open handle after assertions pass and exits through external timeout `124`; ports are released.
- `DEV-001` PowerShell blocks `npx.ps1`; use `npx.cmd` or adjust local execution policy.
- `DOCKER-001` Docker daemon access requires elevated execution on this Windows host.
