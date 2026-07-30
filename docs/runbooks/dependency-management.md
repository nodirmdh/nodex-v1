# Dependency Management Runbook

## Purpose

Keep Nodex Intercity dependencies current, secure, license-compliant, and small enough for Telegram Mini Apps.

## Required Checks

Run during foundation setup and then in CI:

```text
pnpm audit
pnpm outdated
pnpm licenses list
pnpm dedupe --check
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

If a tool is not available yet, add it during the foundation stage and document the replacement command.

## Dependency Acceptance Checklist

Before adding a major dependency:

- License is MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, or explicitly approved.
- Latest stable release is recent enough for the package category.
- Repository has recent commits/releases or a stable low-change scope.
- No known critical vulnerability in the selected version.
- Works with TypeScript strict mode.
- Compatible with Next.js SSR/client boundaries.
- Does not force paid infrastructure for core MVP flows.
- Does not duplicate an existing large dependency.
- Bundle impact is acceptable for Mini Apps.
- Removal path is clear if the package becomes unmaintained.

## Renovate Strategy

Use Renovate as the preferred dependency update tool.

Groups:

- `react-next`: React, Next.js, React DOM.
- `ui-foundation`: shadcn-related primitives, Radix, Lucide, Tailwind utilities.
- `tanstack`: TanStack Query/Table/Virtual packages.
- `nestjs`: NestJS packages.
- `prisma`: Prisma packages.
- `testing`: Vitest, Playwright, Testing Library, MSW.
- `infra`: Docker image tags and GitHub Actions.

Rules:

- Patch/minor updates can open grouped PRs.
- Major updates require separate PRs.
- Security updates are ungrouped and high priority.
- Lockfile maintenance runs weekly.

## Vulnerability Handling

Severity policy:

- Critical/high in runtime dependency: block release until patched, replaced, or explicitly accepted.
- Critical/high in dev dependency: block release if exploitable in CI/build/developer workflow.
- Medium: patch in next maintenance window unless exploit path affects auth, payments, files, or CI.
- Low: track through regular update cycle.

Any accepted vulnerability must have:

- package and version;
- advisory link;
- exploitability assessment;
- mitigation;
- owner;
- review date.

## License Handling

Allowed by default:

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC

Needs explicit review:

- MPL
- EPL
- LGPL
- GPL
- AGPL
- custom or unclear licenses

Copied code/templates:

- record source URL;
- record license;
- preserve notices;
- describe local changes;
- add entry to `THIRD_PARTY_NOTICES.md`.

## Bundle Control

Mini Apps must not import heavy admin-only dependencies.

Required controls:

- route-level dynamic imports for maps, charts, uploads, and admin-only tables;
- bundle analyzer command in foundation stage;
- shared package boundaries that prevent admin code from entering client/driver bundles;
- visual shell review on mobile viewport.

## Abandoned Package Response

If a dependency becomes inactive:

1. Check whether it is stable and low-risk.
2. Search for maintained fork or replacement.
3. Estimate migration effort.
4. Add replacement ADR if it affects architecture.
5. Remove dependency if it touches security, auth, payments, files, or network input.

## Release Gate

Before production release:

- audit has no unaccepted critical/high issues;
- license report has no unapproved copyleft/custom license;
- lockfile is committed;
- `THIRD_PARTY_NOTICES.md` is updated;
- dependency update PRs are green or intentionally deferred.
