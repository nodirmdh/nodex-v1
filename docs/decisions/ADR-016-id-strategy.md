# ADR-016: ID Strategy

Status: Accepted

Use Prisma `cuid()` string identifiers for foundation models.

Why: IDs are URL-safe, do not expose row counts, work across app boundaries, and avoid database sequence coordination. We can later move high-volume event tables to UUIDv7/ULID if query locality becomes important.
