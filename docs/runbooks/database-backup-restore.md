# Database Backup and Restore

## Backup

Use production-managed backups first. For manual PostgreSQL backups, run `pg_dump` with a readonly credential and store encrypted output outside the application host.

Required metadata:

- database name
- migration version
- backup timestamp in UTC
- operator
- checksum

## Restore

1. Restore into a new database first.
2. Run Prisma validate.
3. Run application health checks.
4. Verify payment ledger balance samples.
5. Promote only after finance and operations sign-off.

Never restore directly over production without an approved incident command.
