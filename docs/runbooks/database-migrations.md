# Database Migrations

Foundation commands:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:reset
```

Rules:

- Create migrations through Prisma.
- Do not edit production migrations after deployment.
- Add seed updates when new required roles, permissions, settings, or feature flags are introduced.
- Use `BigInt` for monetary minor units.
