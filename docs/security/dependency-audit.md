# Dependency Audit

Date: 2026-07-30

## Policy

- Runtime critical/high vulnerabilities block release.
- Documented dev-only vulnerabilities do not block release when:
  - runtime exposure is absent;
  - production bundles/images do not include the vulnerable package;
  - dependency path is confirmed;
  - mitigation and review date are documented;
  - no safe compatible update is currently available.
- Dev-only exceptions must be reviewed again after dependency updates.

## Commands

```bash
pnpm audit:production
pnpm audit:all
pnpm why brace-expansion
```

## Current Dev-Only Exception

Advisory: GHSA-mh99-v99m-4gvg

Package: `brace-expansion`

Affected version: `<=5.0.7`

Patched version: `>=5.0.8`

Dependency chain:

```text
@nodex/eslint-config
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
eslint
@eslint/config-array / @eslint/eslintrc
minimatch
brace-expansion
```

Latest audit result:

```text
pnpm audit:production
Exit code: 1
Severity: 1 low | 1 high

pnpm audit:all
Exit code: 1
Severity: 1 low | 1 high
```

`pnpm audit:production` reports the advisory because `@nodex/eslint-config` is a
private workspace package with ESLint tooling dependencies. The reported high
path is still limited to the ESLint/minimatch tooling graph and is not imported
by application runtime code.

Why a direct override is incompatible:

`minimatch@3` expects the older `brace-expansion` API. A forced override to `brace-expansion@5.0.8` was tested and caused ESLint to fail with `TypeError: expand is not a function`.

Exploitability:

The vulnerable package is used by ESLint file-pattern matching during development and CI. It is not used by the application runtime to process user-controlled application input.

Runtime exposure:

- API runtime: not imported by API source.
- Frontend production bundles: not imported by Next application source.
- Docker runtime images: must be checked to install production dependencies only.
- User input: not parsed by ESLint/minimatch during app runtime.

Mitigation:

- Keep runtime dependency audits free of critical and high vulnerabilities.
- Do not force an incompatible major override.
- Upgrade ESLint/minimatch chain when a compatible patched dependency path is available.

Owner: engineering

Review by: 2026-08-12

Removal condition:

Remove this exception when ESLint or its dependency chain uses a compatible patched `brace-expansion`, or when the project adopts a tooling path that no longer depends on the vulnerable version.
