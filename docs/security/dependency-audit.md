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

Advisory: GHSA-52cp-r559-cp3m

Package: `js-yaml`

Affected version: `>=4.0.0 <4.3.0`

Patched version: `>=4.3.0`

Dependency chain:

```text
orval
js-yaml
```

Latest audit result:

```text
pnpm audit:production
Exit code: 0
Severity: 1 low

pnpm audit:all
Exit code: 1
Severity: 1 low | 1 high
```

`pnpm audit:production --audit-level high` is release-clean. The remaining high
advisory appears only in the all-dependencies audit because Orval is API client
generation tooling. The reported high path is limited to OpenAPI generation and
is not imported by application runtime code.

Why a direct override is not applied in this phase:

Orval pins its own transitive `js-yaml` dependency. Updating the generator chain
should be tested separately with OpenAPI and generated client diffs.

Exploitability:

The vulnerable package is used while generating the API client from the local
OpenAPI document during development and CI. It is not used by the application
runtime to parse user-controlled YAML.

Runtime exposure:

- API runtime: not imported by API source.
- Frontend production bundles: not imported by Next application source.
- Docker runtime images: must be checked to install production dependencies only.
- User input: not parsed by Orval/js-yaml during app runtime.

Mitigation:

- Keep runtime dependency audits free of critical and high vulnerabilities.
- Do not force an untested transitive override in launch acceptance.
- Upgrade Orval/js-yaml chain when a compatible patched dependency path is available.

Owner: engineering

Review by: 2026-08-12

Removal condition:

Remove this exception when Orval or its dependency chain uses `js-yaml >=4.3.0`,
or when the project adopts a tooling path that no longer depends on the
vulnerable version.
