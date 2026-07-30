# Third-Party Notices

This project uses open-source software. The project itself is private and `UNLICENSED`; dependency notices are tracked through the lockfile and the register below.

Current selected dependency families are tracked in:

- `docs/architecture/open-source-register.md`
- `docs/architecture/reuse-audit.md`

## Notice Policy

- Preserve copyright notices required by dependency licenses.
- Do not copy GPL/AGPL code into the project without explicit approval.
- Record source, license, version, and local modifications for any copied template or substantial code fragment.
- Prefer MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, and similarly permissive licenses.

## Installed Foundation Families

- shadcn/ui: MIT
- Radix UI: MIT
- Tailwind CSS: MIT
- TanStack Query/Table: MIT
- React Hook Form: MIT
- Zod: MIT
- MapLibre GL JS: BSD-3-Clause
- Uppy: MIT
- CASL: MIT
- BullMQ: MIT
- Prisma: Apache-2.0
- NestJS: MIT
- grammY: MIT
- Orval: MIT
- Storybook: MIT
- Playwright: Apache-2.0
- Pino: MIT

## Foundation Audit Notes

- `pnpm licenses:check` completed on 2026-07-29 and reported `UNLICENSED: 1`, which is the private root workspace package.
- `pnpm audit --audit-level high` is reduced to one high advisory in dev tooling: `brace-expansion` through ESLint/minimatch. A direct major-version override to `brace-expansion@5.0.8` was tested and rejected because it breaks ESLint's `minimatch@3` integration.
- Production-facing advisories from `fast-xml-parser`, `valibot`, `path-to-regexp`, `lodash`, `js-yaml`, `sharp`, and `postcss` were mitigated through workspace overrides.
- No third-party templates or source files were copied into the repository beyond normal package installation and generated clients.
